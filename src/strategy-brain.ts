/**
 * Strategy Brain - AI-powered decision making for vault rebalancing
 * 
 * This is the core intelligence that decides when and how to rebalance.
 */

import { 
  AgentConfig, 
  ProtocolAPY, 
  RiskScore, 
  VaultState, 
  RebalanceDecision,
  StrategyPosition 
} from './types';
import { fetchAllAPYs, calculateRiskScores, rankOpportunities } from './apy-monitor';

export class StrategyBrain {
  private config: AgentConfig;
  private lastRebalanceTime: Date | null = null;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Analyze current market conditions and vault state to decide if rebalancing is needed
   */
  async analyzeAndDecide(vaultState: VaultState): Promise<RebalanceDecision> {
    // 1. Fetch current APYs
    const apys = await fetchAllAPYs('USDC');
    const risks = calculateRiskScores(apys);
    const ranked = rankOpportunities(apys, risks, this.config.minRiskScore);

    // 2. Check time since last rebalance
    if (this.lastRebalanceTime) {
      const timeSinceRebalance = (Date.now() - this.lastRebalanceTime.getTime()) / 1000;
      if (timeSinceRebalance < this.config.minTimeBetweenRebalances) {
        return {
          shouldRebalance: false,
          reason: `Too soon since last rebalance (${Math.floor(timeSinceRebalance / 60)}m ago, min ${this.config.minTimeBetweenRebalances / 60}m)`,
          proposedChanges: [],
          expectedAPYImprovement: 0,
          estimatedGasCost: 0,
        };
      }
    }

    // 3. Calculate optimal allocation based on risk-adjusted returns
    const optimalAllocation = this.calculateOptimalAllocation(ranked);

    // 4. Compare to current allocation
    const currentAllocation = this.getCurrentAllocationMap(vaultState.positions);
    const changes = this.calculateRequiredChanges(currentAllocation, optimalAllocation, vaultState.totalValueUSD);

    // 5. Check if changes are worth the gas cost
    const expectedImprovement = this.calculateExpectedImprovement(
      vaultState.positions,
      optimalAllocation,
      apys
    );

    const estimatedGas = changes.length * 0.001 * 200; // ~$0.20 per rebalance tx at current SOL prices
    
    if (expectedImprovement < this.config.minAPYDifferenceToRebalance) {
      return {
        shouldRebalance: false,
        reason: `APY improvement (${(expectedImprovement * 100).toFixed(2)}%) below threshold (${(this.config.minAPYDifferenceToRebalance * 100).toFixed(2)}%)`,
        proposedChanges: [],
        expectedAPYImprovement: expectedImprovement,
        estimatedGasCost: estimatedGas,
      };
    }

    if (estimatedGas > this.config.maxGasCostForRebalance) {
      return {
        shouldRebalance: false,
        reason: `Gas cost ($${estimatedGas.toFixed(2)}) exceeds max ($${this.config.maxGasCostForRebalance})`,
        proposedChanges: changes,
        expectedAPYImprovement: expectedImprovement,
        estimatedGasCost: estimatedGas,
      };
    }

    // 6. Rebalance recommended!
    return {
      shouldRebalance: true,
      reason: `Rebalancing will improve APY by ${(expectedImprovement * 100).toFixed(2)}%`,
      proposedChanges: changes,
      expectedAPYImprovement: expectedImprovement,
      estimatedGasCost: estimatedGas,
    };
  }

  /**
   * Calculate optimal allocation across protocols
   * Uses inverse-risk-weighted allocation with max caps
   */
  private calculateOptimalAllocation(
    ranked: { protocol: string; riskAdjustedAPY: number; riskScore: number }[]
  ): Map<string, number> {
    const allocation = new Map<string, number>();
    
    // Must have minimum diversity
    const protocolsToUse = ranked.slice(0, Math.max(this.config.minProtocolsForDiversity, ranked.length));
    
    // Weight by risk-adjusted APY
    const totalWeight = protocolsToUse.reduce((sum, p) => sum + p.riskAdjustedAPY, 0);
    
    for (const protocol of protocolsToUse) {
      let weight = protocol.riskAdjustedAPY / totalWeight;
      
      // Cap at max allocation
      weight = Math.min(weight, this.config.maxAllocationPerProtocol);
      
      allocation.set(protocol.protocol, weight);
    }
    
    // Normalize to sum to 1
    const totalAllocation = Array.from(allocation.values()).reduce((a, b) => a + b, 0);
    for (const [protocol, weight] of allocation) {
      allocation.set(protocol, weight / totalAllocation);
    }
    
    return allocation;
  }

  /**
   * Get current allocation as a map
   */
  private getCurrentAllocationMap(positions: StrategyPosition[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const pos of positions) {
      map.set(pos.protocol, pos.allocation);
    }
    return map;
  }

  /**
   * Calculate the changes needed to reach optimal allocation
   */
  private calculateRequiredChanges(
    current: Map<string, number>,
    optimal: Map<string, number>,
    totalValue: number
  ): { from: { protocol: string; amount: number }; to: { protocol: string; amount: number } }[] {
    const changes: { from: { protocol: string; amount: number }; to: { protocol: string; amount: number } }[] = [];
    
    // Find protocols that need to decrease (sources)
    const decreases: { protocol: string; amount: number }[] = [];
    const increases: { protocol: string; amount: number }[] = [];
    
    for (const [protocol, optimalWeight] of optimal) {
      const currentWeight = current.get(protocol) || 0;
      const diff = optimalWeight - currentWeight;
      
      if (diff < -0.01) { // More than 1% decrease needed
        decreases.push({ protocol, amount: Math.abs(diff) * totalValue });
      } else if (diff > 0.01) { // More than 1% increase needed
        increases.push({ protocol, amount: diff * totalValue });
      }
    }
    
    // Match decreases to increases
    let i = 0, j = 0;
    while (i < decreases.length && j < increases.length) {
      const moveAmount = Math.min(decreases[i].amount, increases[j].amount);
      
      changes.push({
        from: { protocol: decreases[i].protocol, amount: moveAmount },
        to: { protocol: increases[j].protocol, amount: moveAmount },
      });
      
      decreases[i].amount -= moveAmount;
      increases[j].amount -= moveAmount;
      
      if (decreases[i].amount < 0.01) i++;
      if (increases[j].amount < 0.01) j++;
    }
    
    return changes;
  }

  /**
   * Calculate expected APY improvement from rebalancing
   */
  private calculateExpectedImprovement(
    currentPositions: StrategyPosition[],
    optimalAllocation: Map<string, number>,
    apys: ProtocolAPY[]
  ): number {
    // Current weighted APY
    const currentAPY = currentPositions.reduce((sum, pos) => {
      return sum + pos.currentAPY * pos.allocation;
    }, 0);
    
    // Optimal weighted APY
    let optimalAPY = 0;
    for (const [protocol, weight] of optimalAllocation) {
      const apy = apys.find(a => a.protocol === protocol);
      if (apy) {
        optimalAPY += apy.totalAPY * weight;
      }
    }
    
    return optimalAPY - currentAPY;
  }

  /**
   * Record that a rebalance happened
   */
  recordRebalance(): void {
    this.lastRebalanceTime = new Date();
  }
}
