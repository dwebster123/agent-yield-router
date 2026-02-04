/**
 * Multi-Chain APY Monitor
 * Fetches real-time yields across Solana, Base, Ethereum, Arbitrum, Hyperliquid
 */

import { ChainId, CHAIN_CONFIG, PROTOCOLS, ProtocolConfig } from './chains';

// DefiLlama yields API
const DEFILLAMA_YIELDS_URL = 'https://yields.llama.fi/pools';

export interface CrossChainAPY {
  protocolId: string;
  protocol: string;
  chain: ChainId;
  asset: string;
  apy: number;
  apyBase: number;
  apyReward: number;
  tvl: number;
  riskBase: number;
  strategyType: string;
  liquidityRisk: string;
  poolId: string;
  symbol: string;
  lastUpdated: Date;
}

export interface CrossChainOpportunity {
  protocolId: string;
  protocol: string;
  chain: ChainId;
  apy: number;
  riskScore: number;
  riskAdjustedAPY: number;
  tvl: number;
  strategyType: string;
  liquidityRisk: string;
  // Cost analysis
  bridgeCostUSD: number;
  gasCostUSD: number;
  totalCostUSD: number;
  minHoldDays: number;  // Days to hold to justify costs
  netAPY: number;  // APY after annualized costs for 30-day hold
}

interface DefiLlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  pool: string;
  stablecoin: boolean;
}

// Cache for DefiLlama data
let poolCache: DefiLlamaPool[] = [];
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

/**
 * Fetch all yield pools from DefiLlama
 */
async function fetchAllPools(): Promise<DefiLlamaPool[]> {
  const now = Date.now();
  if (poolCache.length > 0 && now - cacheTimestamp < CACHE_TTL) {
    return poolCache;
  }

  try {
    const response = await fetch(DEFILLAMA_YIELDS_URL);
    if (!response.ok) {
      throw new Error(`DefiLlama API error: ${response.status}`);
    }
    const data = await response.json() as { data: DefiLlamaPool[] };
    poolCache = data.data;
    cacheTimestamp = now;
    return poolCache;
  } catch (error) {
    console.error('Failed to fetch DefiLlama data:', error);
    throw error;
  }
}

/**
 * Fetch yields for a specific asset across all chains
 */
export async function fetchCrossChainAPYs(asset: string = 'USDC'): Promise<CrossChainAPY[]> {
  const pools = await fetchAllPools();
  const apys: CrossChainAPY[] = [];

  // Symbols to match for USDC
  const symbolsToMatch = asset === 'USDC' 
    ? ['USDC', 'USDC.E', 'USDCE']
    : [asset];

  for (const [protocolId, config] of Object.entries(PROTOCOLS)) {
    const chainConfig = CHAIN_CONFIG[config.chain];
    
    // Find matching pools
    const matchingPools = pools.filter(pool =>
      pool.chain === chainConfig.defillamaChain &&
      pool.project === config.defillamaProject &&
      symbolsToMatch.some(sym => 
        pool.symbol.toUpperCase().includes(sym.toUpperCase())
      )
    );

    if (matchingPools.length > 0) {
      // Take highest APY pool
      const bestPool = matchingPools.reduce((best, current) =>
        (current.apy || 0) > (best.apy || 0) ? current : best
      );

      apys.push({
        protocolId,
        protocol: config.name,
        chain: config.chain,
        asset,
        apy: (bestPool.apy || 0) / 100,
        apyBase: (bestPool.apyBase || bestPool.apy || 0) / 100,
        apyReward: (bestPool.apyReward || 0) / 100,
        tvl: bestPool.tvlUsd || 0,
        riskBase: config.riskBase,
        strategyType: config.strategyType,
        liquidityRisk: config.liquidityRisk,
        poolId: bestPool.pool,
        symbol: bestPool.symbol,
        lastUpdated: new Date(),
      });
    }
  }

  return apys;
}

/**
 * Calculate risk-adjusted scores and rank opportunities
 */
export function rankCrossChainOpportunities(
  apys: CrossChainAPY[],
  currentChain: ChainId = 'solana',
  holdDays: number = 30,
  minRiskScore: number = 60
): CrossChainOpportunity[] {
  const opportunities: CrossChainOpportunity[] = [];

  for (const apy of apys) {
    const chainConfig = CHAIN_CONFIG[apy.chain];
    const protocol = PROTOCOLS[apy.protocolId];
    
    // Calculate costs
    const needsBridge = apy.chain !== currentChain;
    const bridgeCost = needsBridge ? chainConfig.bridgeCostUSD : 0;
    const gasCost = chainConfig.avgGasCostUSD;
    const totalCost = bridgeCost + gasCost;

    // Risk score calculation
    // TVL factor: +10 points for $100M+ TVL, scaling down
    const tvlFactor = Math.min(10, Math.log10(Math.max(1, apy.tvl / 10_000_000)) * 5);
    // Liquidity risk penalty
    const liquidityPenalty = apy.liquidityRisk === 'high' ? -15 : apy.liquidityRisk === 'medium' ? -5 : 0;
    // Strategy type factor: lending is safer
    const strategyFactor = apy.strategyType === 'lending' ? 5 : apy.strategyType === 'vault' ? 0 : -5;
    
    const riskScore = Math.min(100, Math.max(0, 
      apy.riskBase + tvlFactor + liquidityPenalty + strategyFactor
    ));

    // Skip if below min risk
    if (riskScore < minRiskScore) continue;

    // Risk-adjusted APY
    const riskAdjustedAPY = apy.apy * (riskScore / 100);

    // Net APY after costs (annualized cost based on hold period)
    const annualizedCost = (totalCost / 1000) * (365 / holdDays); // Assume $1000 position
    const netAPY = apy.apy - annualizedCost;

    // Calculate min hold days to be profitable vs 0% yield
    const minHoldDays = totalCost > 0 && apy.apy > 0
      ? Math.ceil((totalCost / 1000) / (apy.apy / 365))
      : 0;

    opportunities.push({
      protocolId: apy.protocolId,
      protocol: apy.protocol,
      chain: apy.chain,
      apy: apy.apy,
      riskScore,
      riskAdjustedAPY,
      tvl: apy.tvl,
      strategyType: apy.strategyType,
      liquidityRisk: apy.liquidityRisk,
      bridgeCostUSD: bridgeCost,
      gasCostUSD: gasCost,
      totalCostUSD: totalCost,
      minHoldDays,
      netAPY,
    });
  }

  // Sort by risk-adjusted APY
  return opportunities.sort((a, b) => b.riskAdjustedAPY - a.riskAdjustedAPY);
}

/**
 * Get best opportunity considering current position
 */
export function getBestOpportunity(
  opportunities: CrossChainOpportunity[],
  currentChain: ChainId,
  positionSize: number,
  riskProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
): CrossChainOpportunity | null {
  // Filter by risk profile
  const filtered = opportunities.filter(opp => {
    if (riskProfile === 'conservative') {
      return opp.strategyType === 'lending' && opp.liquidityRisk === 'low';
    }
    if (riskProfile === 'moderate') {
      return opp.liquidityRisk !== 'high';
    }
    return true; // Aggressive: all options
  });

  if (filtered.length === 0) return null;

  // For small positions, prefer same-chain to avoid bridge costs
  if (positionSize < 500) {
    const sameChain = filtered.find(opp => opp.chain === currentChain);
    if (sameChain && sameChain.riskAdjustedAPY > filtered[0].riskAdjustedAPY * 0.8) {
      return sameChain;
    }
  }

  return filtered[0];
}

/**
 * Format opportunities for display
 */
export function formatOpportunitiesTable(
  opportunities: CrossChainOpportunity[],
  currentChain: ChainId
): string {
  let output = '\n🌐 Cross-Chain USDC Yield Opportunities\n';
  output += `📍 Current position: ${CHAIN_CONFIG[currentChain].name}\n`;
  output += '═'.repeat(80) + '\n\n';

  // Group by chain
  const chains = [...new Set(opportunities.map(o => o.chain))];
  
  for (const chain of chains) {
    const chainOpps = opportunities.filter(o => o.chain === chain);
    const chainConfig = CHAIN_CONFIG[chain];
    const isSameChain = chain === currentChain;

    output += `${chainConfig.name} ${isSameChain ? '(current)' : ''}\n`;
    output += '─'.repeat(40) + '\n';

    for (const opp of chainOpps) {
      const apyStr = (opp.apy * 100).toFixed(2).padStart(6);
      const riskStr = opp.riskScore.toFixed(0).padStart(3);
      const adjStr = (opp.riskAdjustedAPY * 100).toFixed(2).padStart(6);
      const tvlStr = (opp.tvl / 1_000_000).toFixed(1).padStart(6);
      const costStr = opp.totalCostUSD.toFixed(2).padStart(5);

      output += `  ${opp.protocol.padEnd(15)} `;
      output += `APY: ${apyStr}% | `;
      output += `Risk: ${riskStr}/100 | `;
      output += `Adj: ${adjStr}% | `;
      output += `TVL: $${tvlStr}M | `;
      output += `Cost: $${costStr}\n`;
      output += `    Type: ${opp.strategyType} | `;
      output += `Liquidity: ${opp.liquidityRisk} | `;
      output += `Min hold: ${opp.minHoldDays}d\n`;
    }
    output += '\n';
  }

  return output;
}

/**
 * Get summary recommendation
 */
export async function getRecommendation(
  currentChain: ChainId = 'solana',
  positionSize: number = 1000,
  riskProfile: 'conservative' | 'moderate' | 'aggressive' = 'moderate'
): Promise<string> {
  const apys = await fetchCrossChainAPYs('USDC');
  const opportunities = rankCrossChainOpportunities(apys, currentChain);
  const best = getBestOpportunity(opportunities, currentChain, positionSize, riskProfile);

  if (!best) {
    return 'No suitable opportunities found for your risk profile.';
  }

  const chainConfig = CHAIN_CONFIG[best.chain];
  const needsBridge = best.chain !== currentChain;

  let rec = '\n🎯 RECOMMENDATION\n';
  rec += '═'.repeat(50) + '\n';
  rec += `Protocol: ${best.protocol} on ${chainConfig.name}\n`;
  rec += `APY: ${(best.apy * 100).toFixed(2)}%\n`;
  rec += `Risk Score: ${best.riskScore}/100\n`;
  rec += `Risk-Adjusted APY: ${(best.riskAdjustedAPY * 100).toFixed(2)}%\n`;
  rec += `Strategy: ${best.strategyType} (${best.liquidityRisk} liquidity)\n`;
  
  if (needsBridge) {
    rec += `\n⚠️ Requires bridging from ${CHAIN_CONFIG[currentChain].name}\n`;
    rec += `  Bridge cost: $${best.bridgeCostUSD.toFixed(2)}\n`;
    rec += `  Bridge time: ~${chainConfig.bridgeTimeMinutes} minutes\n`;
    rec += `  Min hold for profit: ${best.minHoldDays} days\n`;
  }

  rec += `\n📊 Position size: $${positionSize}\n`;
  rec += `Expected 30-day return: $${(positionSize * best.apy / 12).toFixed(2)}\n`;

  return rec;
}

// CLI test
if (require.main === module) {
  (async () => {
    console.log('Fetching cross-chain yields...\n');
    
    const apys = await fetchCrossChainAPYs('USDC');
    console.log(`Found ${apys.length} yield opportunities\n`);
    
    const opportunities = rankCrossChainOpportunities(apys, 'solana');
    console.log(formatOpportunitiesTable(opportunities, 'solana'));
    
    console.log(await getRecommendation('solana', 1000, 'moderate'));
  })();
}
