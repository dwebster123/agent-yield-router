/**
 * Cross-Chain Yield Router - Chain Definitions
 * Supports: Solana, Base, Ethereum, Arbitrum, Hyperliquid
 */

export type ChainId = 'solana' | 'base' | 'ethereum' | 'arbitrum' | 'hyperliquid';

export interface ChainConfig {
  name: string;
  defillamaChain: string;
  cctpSupported: boolean;
  cctpDomain?: number;  // CCTP domain ID
  nativeToken: string;
  avgGasCostUSD: number;  // Approximate gas cost for a swap/deposit
  bridgeCostUSD: number;  // Approximate cost to bridge via CCTP
  bridgeTimeMinutes: number;  // Approximate bridge time
}

export const CHAIN_CONFIG: Record<ChainId, ChainConfig> = {
  solana: {
    name: 'Solana',
    defillamaChain: 'Solana',
    cctpSupported: true,
    cctpDomain: 5,
    nativeToken: 'SOL',
    avgGasCostUSD: 0.001,
    bridgeCostUSD: 1.50,  // CCTP attestation + gas
    bridgeTimeMinutes: 2,
  },
  base: {
    name: 'Base',
    defillamaChain: 'Base',
    cctpSupported: true,
    cctpDomain: 6,
    nativeToken: 'ETH',
    avgGasCostUSD: 0.05,
    bridgeCostUSD: 1.00,
    bridgeTimeMinutes: 15,
  },
  ethereum: {
    name: 'Ethereum',
    defillamaChain: 'Ethereum',
    cctpSupported: true,
    cctpDomain: 0,
    nativeToken: 'ETH',
    avgGasCostUSD: 5.00,
    bridgeCostUSD: 2.00,
    bridgeTimeMinutes: 15,
  },
  arbitrum: {
    name: 'Arbitrum',
    defillamaChain: 'Arbitrum',
    cctpSupported: true,
    cctpDomain: 3,
    nativeToken: 'ETH',
    avgGasCostUSD: 0.10,
    bridgeCostUSD: 1.00,
    bridgeTimeMinutes: 15,
  },
  hyperliquid: {
    name: 'Hyperliquid',
    defillamaChain: 'Hyperliquid',
    cctpSupported: false,  // Uses native bridge
    nativeToken: 'USDC',
    avgGasCostUSD: 0.001,
    bridgeCostUSD: 1.00,  // Arbitrum -> HL bridge
    bridgeTimeMinutes: 5,
  },
};

// Protocol configurations per chain
export interface ProtocolConfig {
  name: string;
  chain: ChainId;
  defillamaProject: string;
  riskBase: number;
  strategyType: 'lending' | 'lp' | 'vault' | 'perp-lp';
  liquidityRisk: 'low' | 'medium' | 'high';
  minDeposit: number;  // Minimum USD to make gas worthwhile
}

export const PROTOCOLS: Record<string, ProtocolConfig> = {
  // Solana
  'kamino-solana': {
    name: 'Kamino',
    chain: 'solana',
    defillamaProject: 'kamino-lend',
    riskBase: 88,
    strategyType: 'lending',
    liquidityRisk: 'low',
    minDeposit: 10,
  },
  'loopscale-solana': {
    name: 'Loopscale',
    chain: 'solana',
    defillamaProject: 'loopscale',
    riskBase: 75,
    strategyType: 'lending',
    liquidityRisk: 'low',
    minDeposit: 10,
  },
  'jup-lend-solana': {
    name: 'Jupiter Lend',
    chain: 'solana',
    defillamaProject: 'jupiter-perps',
    riskBase: 85,
    strategyType: 'vault',
    liquidityRisk: 'medium',
    minDeposit: 50,
  },
  'drift-solana': {
    name: 'Drift',
    chain: 'solana',
    defillamaProject: 'drift-trade',
    riskBase: 82,
    strategyType: 'vault',
    liquidityRisk: 'medium',
    minDeposit: 50,
  },
  'marginfi-solana': {
    name: 'MarginFi',
    chain: 'solana',
    defillamaProject: 'marginfi',
    riskBase: 80,
    strategyType: 'lending',
    liquidityRisk: 'low',
    minDeposit: 10,
  },

  // Base
  'aave-base': {
    name: 'Aave',
    chain: 'base',
    defillamaProject: 'aave-v3',
    riskBase: 92,
    strategyType: 'lending',
    liquidityRisk: 'low',
    minDeposit: 100,
  },
  'moonwell-base': {
    name: 'Moonwell',
    chain: 'base',
    defillamaProject: 'moonwell',
    riskBase: 78,
    strategyType: 'lending',
    liquidityRisk: 'low',
    minDeposit: 100,
  },
  'morpho-base': {
    name: 'Morpho',
    chain: 'base',
    defillamaProject: 'morpho-blue',
    riskBase: 85,
    strategyType: 'lending',
    liquidityRisk: 'low',
    minDeposit: 100,
  },

  // Ethereum
  'aave-ethereum': {
    name: 'Aave',
    chain: 'ethereum',
    defillamaProject: 'aave-v3',
    riskBase: 95,
    strategyType: 'lending',
    liquidityRisk: 'low',
    minDeposit: 1000,  // High gas makes small deposits uneconomical
  },
  'compound-ethereum': {
    name: 'Compound',
    chain: 'ethereum',
    defillamaProject: 'compound-v3',
    riskBase: 93,
    strategyType: 'lending',
    liquidityRisk: 'low',
    minDeposit: 1000,
  },

  // Arbitrum
  'aave-arbitrum': {
    name: 'Aave',
    chain: 'arbitrum',
    defillamaProject: 'aave-v3',
    riskBase: 92,
    strategyType: 'lending',
    liquidityRisk: 'low',
    minDeposit: 100,
  },
  'radiant-arbitrum': {
    name: 'Radiant',
    chain: 'arbitrum',
    defillamaProject: 'radiant-v2',
    riskBase: 72,
    strategyType: 'lending',
    liquidityRisk: 'medium',
    minDeposit: 100,
  },

  // Hyperliquid
  'hlp-hyperliquid': {
    name: 'HLP Vault',
    chain: 'hyperliquid',
    defillamaProject: 'hyperliquid-hlp',
    riskBase: 70,
    strategyType: 'perp-lp',
    liquidityRisk: 'high',
    minDeposit: 500,  // Counterparty risk requires larger position
  },
};

// Get all protocols for a specific chain
export function getProtocolsForChain(chain: ChainId): ProtocolConfig[] {
  return Object.values(PROTOCOLS).filter(p => p.chain === chain);
}

// Get protocol by ID
export function getProtocol(id: string): ProtocolConfig | undefined {
  return PROTOCOLS[id];
}
