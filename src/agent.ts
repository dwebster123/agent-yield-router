/**
 * Voltr Yield Optimizer Agent
 * 
 * Main agent class that orchestrates monitoring, decision-making, and execution.
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { StrategyBrain } from './strategy-brain';
import { AgentConfig, VaultState, RebalanceDecision, StrategyPosition } from './types';
import { VoltrYieldClient } from './voltr-client';
import { fetchAllAPYs, calculateRiskScores, getYieldSummary } from './apy-monitor';

export class YieldOptimizerAgent {
  private config: AgentConfig;
  private brain: StrategyBrain;
  private connection: Connection;
  private voltrClient: VoltrYieldClient;
  private isRunning: boolean = false;
  private dryRun: boolean;

  constructor(config: AgentConfig, dryRun: boolean = true) {
    this.config = config;
    this.brain = new StrategyBrain(config);
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.dryRun = dryRun;
    this.voltrClient = new VoltrYieldClient({
      rpcUrl: config.rpcUrl,
      vaultPubkey: config.vaultPubkey,
    });
  }

  /**
   * Start the agent's monitoring loop
   */
  async start(intervalMs: number = 60000): Promise<void> {
    console.log('🚀 Voltr Yield Optimizer Agent starting...');
    console.log(`   Vault: ${this.config.vaultPubkey}`);
    console.log(`   Check interval: ${intervalMs / 1000}s`);
    console.log(`   Mode: ${this.dryRun ? 'DRY RUN (no transactions)' : 'LIVE'}`);
    
    this.isRunning = true;
    
    while (this.isRunning) {
      try {
        await this.runCycle();
      } catch (error) {
        console.error('❌ Error in agent cycle:', error);
      }
      
      await this.sleep(intervalMs);
    }
  }

  /**
   * Stop the agent
   */
  stop(): void {
    console.log('🛑 Stopping agent...');
    this.isRunning = false;
  }

  /**
   * Run a single monitoring/rebalancing cycle
   */
  async runCycle(): Promise<RebalanceDecision> {
    console.log(`\n⏰ [${new Date().toISOString()}] Running cycle...`);
    
    // 1. Fetch current vault state
    const vaultState = await this.fetchVaultState();
    console.log(`   💰 Vault TVL: $${vaultState.totalValueUSD.toLocaleString()}`);
    
    // 2. Analyze and get decision
    const decision = await this.brain.analyzeAndDecide(vaultState);
    
    // 3. Log decision
    if (decision.shouldRebalance) {
      console.log(`   ✅ REBALANCE RECOMMENDED: ${decision.reason}`);
      console.log(`   📈 Expected APY improvement: +${(decision.expectedAPYImprovement * 100).toFixed(2)}%`);
      console.log(`   ⛽ Estimated gas: $${decision.estimatedGasCost.toFixed(2)}`);
      
      for (const change of decision.proposedChanges) {
        console.log(`      ${change.from.protocol} → ${change.to.protocol}: $${change.from.amount.toLocaleString()}`);
      }
      
      // 4. Execute rebalance
      if (!this.dryRun) {
        await this.executeRebalance(decision);
        this.brain.recordRebalance();
      } else {
        console.log('   🏃 DRY RUN - skipping execution');
      }
    } else {
      console.log(`   ⏸️  No rebalance needed: ${decision.reason}`);
    }
    
    return decision;
  }

  /**
   * Fetch current vault state - combines Voltr data with live APYs
   */
  private async fetchVaultState(): Promise<VaultState> {
    // Get vault state from Voltr
    const voltrState = await this.voltrClient.getVaultState();
    
    // Get live APYs to update position data
    const apys = await fetchAllAPYs('USDC');
    
    // Map Voltr strategies to our position format with live APYs
    const positions: StrategyPosition[] = voltrState.strategies.map(strategy => {
      const liveApy = apys.find(a => a.protocol === strategy.protocol);
      return {
        strategyPubkey: strategy.strategyPubkey,
        protocol: strategy.protocol,
        asset: 'USDC', // TODO: support multi-asset
        amount: strategy.currentValue,
        valueUSD: strategy.currentValue,
        currentAPY: liveApy?.totalAPY || strategy.apy,
        allocation: strategy.currentValue / voltrState.totalValue,
      };
    });

    return {
      vaultPubkey: this.config.vaultPubkey,
      totalValueUSD: voltrState.totalValue,
      positions,
      lastRebalance: new Date(Date.now() - 24 * 60 * 60 * 1000), // Track in real impl
      performanceSinceInception: 0.12, // Track in real impl
    };
  }

  /**
   * Execute a rebalance using Voltr SDK
   */
  private async executeRebalance(decision: RebalanceDecision): Promise<string[]> {
    console.log('   🔄 Executing rebalance...');
    
    const changes = decision.proposedChanges.map(change => ({
      from: {
        protocol: change.from.protocol,
        strategyPubkey: this.voltrClient.getStrategyConfig(change.from.protocol)?.strategyPubkey || '',
        amount: change.from.amount,
      },
      to: {
        protocol: change.to.protocol,
        strategyPubkey: this.voltrClient.getStrategyConfig(change.to.protocol)?.strategyPubkey || '',
        amount: change.to.amount,
      },
    }));
    
    const result = await this.voltrClient.executeRebalance(changes, this.dryRun);
    
    console.log(`   ✅ Rebalance complete! ${result.signatures.length} transactions`);
    return result.signatures;
  }

  /**
   * Generate a human-readable status report
   */
  async getStatusReport(): Promise<string> {
    const vaultState = await this.fetchVaultState();
    const decision = await this.brain.analyzeAndDecide(vaultState);
    const yieldSummary = await getYieldSummary('USDC');
    
    // Calculate weighted average APY
    const weightedAPY = vaultState.positions.reduce((sum, pos) => {
      return sum + pos.currentAPY * pos.allocation;
    }, 0);

    let report = `
# Voltr Yield Optimizer Status Report
Generated: ${new Date().toISOString()}

## Vault Overview
- **Total Value:** $${vaultState.totalValueUSD.toLocaleString()}
- **Current Weighted APY:** ${(weightedAPY * 100).toFixed(2)}%
- **Performance:** +${(vaultState.performanceSinceInception * 100).toFixed(2)}% since inception

## Current Positions
${vaultState.positions.map(p => 
  `- **${p.protocol}**: $${p.valueUSD.toLocaleString()} (${(p.allocation * 100).toFixed(1)}%) @ ${(p.currentAPY * 100).toFixed(2)}% APY`
).join('\n')}

## Market Yields (Live)
${yieldSummary}

## Recommendation
${decision.shouldRebalance 
  ? `**REBALANCE RECOMMENDED**\n${decision.reason}\nExpected improvement: +${(decision.expectedAPYImprovement * 100).toFixed(2)}% APY`
  : `**NO ACTION NEEDED**\n${decision.reason}`
}

## Risk Parameters
- Max per protocol: ${(this.config.maxAllocationPerProtocol * 100).toFixed(0)}%
- Min protocols: ${this.config.minProtocolsForDiversity}
- Min risk score: ${this.config.minRiskScore}
- Rebalance threshold: ${(this.config.minAPYDifferenceToRebalance * 100).toFixed(1)}%
`;
    
    return report;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
