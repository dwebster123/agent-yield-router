/**
 * Voltr Yield Optimizer - Type Definitions
 */

// Supported protocols - now using DefiLlama data
export type Protocol = 'kamino' | 'save' | 'loopscale' | 'drift' | 'jito' | 'jupiter' | 'marinade';

export interface ProtocolAPY {
  protocol: string;
  asset: string;
  baseAPY: number;
  rewardsAPY: number;
  totalAPY: number;
  tvl: number;
  utilizationRate: number;
  lastUpdated: Date;
  poolId?: string;        // DefiLlama pool ID
  symbol?: string;        // Token symbol from DefiLlama
}

export interface RiskScore {
  protocol: string;
  tvlScore: number;        // Higher TVL = lower risk
  auditScore: number;      // Audited = lower risk
  ageScore: number;        // Older = lower risk
  exploitScore: number;    // No exploits = lower risk
  totalScore: number;      // 0-100, higher = safer
}

export interface StrategyPosition {
  strategyPubkey: string;
  protocol: string;
  asset: string;
  amount: number;
  valueUSD: number;
  currentAPY: number;
  allocation: number;      // Percentage of total vault
}

export interface VaultState {
  vaultPubkey: string;
  totalValueUSD: number;
  positions: StrategyPosition[];
  lastRebalance: Date;
  performanceSinceInception: number;
}

export interface RebalanceDecision {
  shouldRebalance: boolean;
  reason: string;
  proposedChanges: {
    from: { protocol: string; amount: number };
    to: { protocol: string; amount: number };
  }[];
  expectedAPYImprovement: number;
  estimatedGasCost: number;
}

export interface AgentConfig {
  // Risk parameters
  maxAllocationPerProtocol: number;  // e.g., 0.4 = 40% max
  minProtocolsForDiversity: number;  // e.g., 3
  minRiskScore: number;              // e.g., 60 = only protocols with score >= 60
  
  // Rebalance parameters
  minAPYDifferenceToRebalance: number;  // e.g., 0.02 = 2%
  minTimeBetweenRebalances: number;     // seconds
  maxGasCostForRebalance: number;       // in USD
  
  // Vault settings
  vaultPubkey: string;
  managerKeypair: string;  // Path to keypair file
  rpcUrl: string;
}

export interface MarketConditions {
  solPrice: number;
  marketVolatility: 'low' | 'medium' | 'high';
  fundingRates: {
    asset: string;
    rate: number;
  }[];
}

// Voltr-specific types
export interface VoltrVaultConfig {
  maxCap: bigint;
  startAtTs: bigint;
  lockedProfitDegradationDuration: bigint;
  managerManagementFee: number;  // basis points
  managerPerformanceFee: number;
  adminManagementFee: number;
  adminPerformanceFee: number;
  redemptionFee: number;
  issuanceFee: number;
  withdrawalWaitingPeriod: bigint;
}

export interface VoltrStrategyInfo {
  strategyPubkey: string;
  adaptorProgram: string;
  protocol: string;
  currentValue: number;
  apy: number;
}
