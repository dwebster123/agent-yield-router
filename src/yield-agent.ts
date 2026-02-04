/**
 * Cross-Chain Yield Agent
 * 
 * An autonomous agent that:
 * 1. Monitors yields across chains (Solana, Base, Arbitrum, Ethereum)
 * 2. Finds optimal risk-adjusted opportunities
 * 3. Routes capital via CCTP/Bankr
 * 4. Earns yield to sustain its own operations
 * 
 * Built for Solana Agent Hackathon + USDC Agent Hackathon
 */

import { ChainId, CHAIN_CONFIG } from './chains';
import { 
  fetchCrossChainAPYs, 
  rankCrossChainOpportunities, 
  getBestOpportunity,
  formatOpportunitiesTable,
  CrossChainOpportunity 
} from './multichain-monitor';
import { 
  executeYieldRoute, 
  calculateSelfSustainability,
  getBalance 
} from './executor';

interface AgentState {
  currentChain: ChainId;
  principal: number;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  currentPosition: {
    chain: ChainId;
    protocol: string;
    amount: number;
    apy: number;
    entryDate: Date;
  } | null;
  totalEarnings: number;
  operatingCosts: number;
  lastCheck: Date;
}

interface AgentAction {
  type: 'hold' | 'rebalance' | 'deposit' | 'withdraw';
  reason: string;
  opportunity?: CrossChainOpportunity;
  amount?: number;
}

/**
 * Cross-Chain Yield Agent
 */
export class YieldAgent {
  private state: AgentState;
  private minAPYImprovement = 0.02;  // 2% min improvement to rebalance
  private minHoldDays = 7;  // Minimum days before considering rebalance
  private operatingCostPerDay = 0.10;  // Estimated daily operating cost

  constructor(
    initialChain: ChainId = 'solana',
    principal: number = 100,
    riskProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
  ) {
    this.state = {
      currentChain: initialChain,
      principal,
      riskProfile,
      currentPosition: null,
      totalEarnings: 0,
      operatingCosts: 0,
      lastCheck: new Date(),
    };
  }

  /**
   * Analyze current market and determine best action
   */
  async analyze(): Promise<AgentAction> {
    console.log('\n🤖 YIELD AGENT ANALYSIS');
    console.log('═'.repeat(60));
    console.log(`Current chain: ${CHAIN_CONFIG[this.state.currentChain].name}`);
    console.log(`Principal: $${this.state.principal}`);
    console.log(`Risk profile: ${this.state.riskProfile}`);
    console.log(`Current position: ${this.state.currentPosition?.protocol || 'None'}`);
    console.log('─'.repeat(60));

    // Fetch opportunities
    console.log('\n📡 Fetching cross-chain yields...');
    const apys = await fetchCrossChainAPYs('USDC');
    const opportunities = rankCrossChainOpportunities(
      apys, 
      this.state.currentChain,
      30,  // 30-day hold assumption
      this.state.riskProfile === 'conservative' ? 80 : 
      this.state.riskProfile === 'moderate' ? 65 : 50
    );

    console.log(formatOpportunitiesTable(opportunities, this.state.currentChain));

    const best = getBestOpportunity(
      opportunities,
      this.state.currentChain,
      this.state.principal,
      this.state.riskProfile
    );

    if (!best) {
      return {
        type: 'hold',
        reason: 'No suitable opportunities found for risk profile',
      };
    }

    // If no current position, deposit
    if (!this.state.currentPosition) {
      return {
        type: 'deposit',
        reason: `New deployment to ${best.protocol} on ${CHAIN_CONFIG[best.chain].name} at ${(best.apy * 100).toFixed(2)}% APY`,
        opportunity: best,
        amount: this.state.principal,
      };
    }

    // Check if rebalance is worthwhile
    const currentAPY = this.state.currentPosition.apy;
    const apyImprovement = best.riskAdjustedAPY - currentAPY;
    
    // Calculate days in current position
    const daysInPosition = Math.floor(
      (Date.now() - this.state.currentPosition.entryDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Don't rebalance too soon
    if (daysInPosition < this.minHoldDays) {
      return {
        type: 'hold',
        reason: `Holding current position (${daysInPosition}d < ${this.minHoldDays}d min hold)`,
      };
    }

    // Check if improvement justifies rebalance costs
    const rebalanceCost = best.totalCostUSD;
    const yearlyImprovement = this.state.principal * apyImprovement;
    const daysToRecoverCost = rebalanceCost / (yearlyImprovement / 365);

    if (apyImprovement < this.minAPYImprovement || daysToRecoverCost > 30) {
      return {
        type: 'hold',
        reason: `Current position is optimal (improvement: ${(apyImprovement * 100).toFixed(2)}%, recovery: ${daysToRecoverCost.toFixed(0)}d)`,
      };
    }

    return {
      type: 'rebalance',
      reason: `Better opportunity: ${best.protocol} on ${CHAIN_CONFIG[best.chain].name} (+${(apyImprovement * 100).toFixed(2)}% APY)`,
      opportunity: best,
      amount: this.state.principal,
    };
  }

  /**
   * Execute the recommended action
   */
  async execute(action: AgentAction, dryRun: boolean = true): Promise<void> {
    console.log('\n🎯 AGENT DECISION');
    console.log('═'.repeat(50));
    console.log(`Action: ${action.type.toUpperCase()}`);
    console.log(`Reason: ${action.reason}`);

    if (action.type === 'hold') {
      console.log('\n✅ No action needed');
      return;
    }

    if (!action.opportunity || !action.amount) {
      console.log('\n❌ Missing opportunity or amount');
      return;
    }

    const result = await executeYieldRoute(
      action.opportunity,
      this.state.currentChain,
      action.amount,
      dryRun
    );

    console.log(`\nResult: ${result.message}`);

    if (result.success && !dryRun) {
      this.state.currentPosition = {
        chain: action.opportunity.chain,
        protocol: action.opportunity.protocol,
        amount: action.amount,
        apy: action.opportunity.apy,
        entryDate: new Date(),
      };
      this.state.currentChain = action.opportunity.chain;
    }
  }

  /**
   * Calculate self-sustainability metrics
   */
  getSustainabilityReport(): string {
    const apy = this.state.currentPosition?.apy || 0.05;  // Default 5%
    const sustainability = calculateSelfSustainability(
      this.state.principal,
      apy,
      this.operatingCostPerDay
    );

    let report = '\n💰 SELF-SUSTAINABILITY REPORT\n';
    report += '═'.repeat(50) + '\n';
    report += `Principal: $${this.state.principal}\n`;
    report += `Current APY: ${(apy * 100).toFixed(2)}%\n`;
    report += '─'.repeat(50) + '\n';
    report += `Daily yield: $${sustainability.dailyYield.toFixed(4)}\n`;
    report += `Daily operating cost: $${sustainability.dailyCost.toFixed(2)}\n`;
    report += `Net daily: $${sustainability.netDaily.toFixed(4)}\n`;
    report += '─'.repeat(50) + '\n';
    
    if (sustainability.isSustainable) {
      report += `✅ SELF-SUSTAINING\n`;
      report += `Monthly profit: $${sustainability.monthlyProfit.toFixed(2)}\n`;
      report += `Annual profit: $${(sustainability.monthlyProfit * 12).toFixed(2)}\n`;
    } else {
      report += `⚠️ NOT YET SUSTAINABLE\n`;
      report += `Need $${((this.operatingCostPerDay * 365) / apy).toFixed(2)} principal at ${(apy * 100).toFixed(2)}% APY\n`;
      report += `Or ${(this.operatingCostPerDay * 365 / this.state.principal * 100).toFixed(2)}% APY on $${this.state.principal}\n`;
    }

    return report;
  }

  /**
   * Run a full analysis and execution cycle
   */
  async run(dryRun: boolean = true): Promise<void> {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║     CROSS-CHAIN YIELD AGENT - Self-Sustaining AI Agent     ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\nAn autonomous agent that earns yield to fund its own existence.\n');

    const action = await this.analyze();
    await this.execute(action, dryRun);
    console.log(this.getSustainabilityReport());
  }
}

// CLI entry point
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const principal = parseFloat(args[0]) || 100;
    const riskProfile = (args[1] as 'conservative' | 'moderate' | 'aggressive') || 'moderate';
    const execute = args.includes('--execute');

    const agent = new YieldAgent('solana', principal, riskProfile);
    await agent.run(!execute);

    if (!execute) {
      console.log('\n💡 Run with --execute to perform real transactions');
    }
  })();
}
