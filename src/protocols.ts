/**
 * Protocol Registry - All supported yield-bearing Solana protocols
 */

export interface ProtocolInfo {
  id: string;
  name: string;
  type: 'lending' | 'lst' | 'perp-lp' | 'payfi' | 'synthetic';
  riskTier: 1 | 2 | 3;  // 1 = safest, 3 = highest risk/reward
  baseRiskScore: number;
  website: string;
  hasVoltrAdaptor: boolean;
  assets: string[];
}

export const PROTOCOLS: Record<string, ProtocolInfo> = {
  // === LENDING PROTOCOLS ===
  kamino: {
    id: 'kamino',
    name: 'Kamino Finance',
    type: 'lending',
    riskTier: 1,
    baseRiskScore: 88,
    website: 'https://kamino.finance',
    hasVoltrAdaptor: true,
    assets: ['USDC', 'USDT', 'SOL', 'ETH', 'BTC'],
  },
  marginfi: {
    id: 'marginfi',
    name: 'MarginFi',
    type: 'lending',
    riskTier: 1,
    baseRiskScore: 85,
    website: 'https://marginfi.com',
    hasVoltrAdaptor: true,
    assets: ['USDC', 'USDT', 'SOL', 'ETH', 'JitoSOL'],
  },
  drift: {
    id: 'drift',
    name: 'Drift Protocol',
    type: 'lending',
    riskTier: 2,
    baseRiskScore: 82,
    website: 'https://drift.trade',
    hasVoltrAdaptor: true,
    assets: ['USDC', 'SOL', 'ETH', 'BTC'],
  },
  solend: {
    id: 'solend',
    name: 'Solend',
    type: 'lending',
    riskTier: 2,
    baseRiskScore: 72,
    website: 'https://solend.fi',
    hasVoltrAdaptor: true,
    assets: ['USDC', 'USDT', 'SOL'],
  },
  
  // === LIQUID STAKING ===
  jito: {
    id: 'jito',
    name: 'Jito (JitoSOL)',
    type: 'lst',
    riskTier: 1,
    baseRiskScore: 90,
    website: 'https://jito.network',
    hasVoltrAdaptor: false,
    assets: ['SOL'],
  },
  jupsol: {
    id: 'jupsol',
    name: 'Jupiter Staked SOL',
    type: 'lst',
    riskTier: 1,
    baseRiskScore: 88,
    website: 'https://jup.ag',
    hasVoltrAdaptor: false,
    assets: ['SOL'],
  },
  
  // === PERP LP VAULTS ===
  jlp: {
    id: 'jlp',
    name: 'Jupiter Liquidity Provider',
    type: 'perp-lp',
    riskTier: 2,
    baseRiskScore: 78,
    website: 'https://jup.ag/perps',
    hasVoltrAdaptor: false,
    assets: ['USDC', 'SOL', 'ETH', 'BTC'],
  },
  
  // === PAYFI / REAL YIELD ===
  huma: {
    id: 'huma',
    name: 'Huma Finance',
    type: 'payfi',
    riskTier: 2,
    baseRiskScore: 75,
    website: 'https://huma.finance',
    hasVoltrAdaptor: false,
    assets: ['USDC'],
  },
  
  // === SYNTHETIC YIELD ===
  ethena: {
    id: 'ethena',
    name: 'Ethena (sUSDe)',
    type: 'synthetic',
    riskTier: 3,
    baseRiskScore: 70,
    website: 'https://ethena.fi',
    hasVoltrAdaptor: false,
    assets: ['USDC', 'USDe'],
  },
};

/**
 * Get protocols by type
 */
export function getProtocolsByType(type: ProtocolInfo['type']): ProtocolInfo[] {
  return Object.values(PROTOCOLS).filter(p => p.type === type);
}

/**
 * Get protocols by risk tier
 */
export function getProtocolsByRiskTier(tier: 1 | 2 | 3): ProtocolInfo[] {
  return Object.values(PROTOCOLS).filter(p => p.riskTier === tier);
}

/**
 * Get protocols with Voltr adaptors (can be managed via Voltr vaults)
 */
export function getVoltrCompatibleProtocols(): ProtocolInfo[] {
  return Object.values(PROTOCOLS).filter(p => p.hasVoltrAdaptor);
}

/**
 * Strategy types the agent can employ
 */
export type StrategyType = 
  | 'lending-rotation'      // Rotate between lending protocols for best APY
  | 'lst-optimization'      // Optimize LST holdings (Jito vs JupSOL etc)
  | 'perp-lp'              // JLP and similar perp LP strategies
  | 'delta-neutral'        // Long spot + short perp for funding capture
  | 'payfi-allocation'     // Real yield from Huma etc
  | 'basis-trade'          // sUSDe and similar synthetic strategies
  | 'hybrid';              // Combination of above

export interface StrategyConfig {
  type: StrategyType;
  protocols: string[];
  maxAllocationPct: number;
  minRiskScore: number;
}

/**
 * Predefined strategy templates
 */
export const STRATEGY_TEMPLATES: Record<string, StrategyConfig> = {
  conservative: {
    type: 'lending-rotation',
    protocols: ['kamino', 'marginfi'],
    maxAllocationPct: 50,
    minRiskScore: 85,
  },
  balanced: {
    type: 'hybrid',
    protocols: ['kamino', 'marginfi', 'drift', 'jito', 'jlp'],
    maxAllocationPct: 35,
    minRiskScore: 75,
  },
  aggressive: {
    type: 'hybrid',
    protocols: ['kamino', 'marginfi', 'drift', 'jlp', 'huma', 'ethena'],
    maxAllocationPct: 30,
    minRiskScore: 65,
  },
};
