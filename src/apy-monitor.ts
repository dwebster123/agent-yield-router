/**
 * APY Monitor - Fetches real-time APYs from Solana lending protocols
 * Uses DefiLlama yields API for aggregated data
 */

import { ProtocolAPY, RiskScore } from './types';

// DefiLlama yields API endpoint
const DEFILLAMA_YIELDS_URL = 'https://yields.llama.fi/pools';

// Protocol configurations with risk parameters
const PROTOCOL_CONFIG: Record<string, {
  name: string;
  defillamaProject: string;
  riskBase: number;  // Base risk score (0-100)
}> = {
  kamino: {
    name: 'Kamino',
    defillamaProject: 'kamino-lend',
    riskBase: 88,  // Well-audited, high TVL, established
  },
  save: {
    name: 'Save (Solend)',
    defillamaProject: 'save',
    riskBase: 72,  // Rebranded Solend, had exploit history
  },
  loopscale: {
    name: 'Loopscale',
    defillamaProject: 'loopscale',
    riskBase: 75,  // Newer protocol
  },
  drift: {
    name: 'Drift',
    defillamaProject: 'drift-staked-sol',  // Drift LST - for SOL yield
    riskBase: 82,
  },
  jito: {
    name: 'Jito',
    defillamaProject: 'jito-liquid-staking',
    riskBase: 90,  // Top Solana LST
  },
  jupiter: {
    name: 'Jupiter',
    defillamaProject: 'jupiter-staked-sol',
    riskBase: 88,
  },
  marinade: {
    name: 'Marinade',
    defillamaProject: 'marinade-liquid-staking',
    riskBase: 85,
  },
};

// Asset mapping for filtering
const ASSET_SYMBOLS: Record<string, string[]> = {
  USDC: ['USDC'],
  USDT: ['USDT'],
  SOL: ['SOL', 'JITOSOL', 'JUPSOL', 'MSOL', 'DSOL', 'BSOL'],
};

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
  ilRisk: string;
  underlyingTokens?: string[];
}

/**
 * Fetch all Solana yield pools from DefiLlama
 */
async function fetchDefiLlamaPools(): Promise<DefiLlamaPool[]> {
  try {
    const response = await fetch(DEFILLAMA_YIELDS_URL);
    if (!response.ok) {
      throw new Error(`DefiLlama API error: ${response.status}`);
    }
    const data = await response.json() as { data: DefiLlamaPool[] };
    
    // Filter for Solana pools only
    return data.data.filter((pool: DefiLlamaPool) => 
      pool.chain === 'Solana' && pool.tvlUsd > 100000 // Min $100k TVL
    );
  } catch (error) {
    console.error('Failed to fetch DefiLlama data:', error);
    throw error;
  }
}

/**
 * Fetch APYs from all integrated protocols
 * @param asset - Asset to fetch APYs for (USDC, USDT, SOL)
 */
export async function fetchAllAPYs(asset: string = 'USDC'): Promise<ProtocolAPY[]> {
  const pools = await fetchDefiLlamaPools();
  const apys: ProtocolAPY[] = [];
  
  // Get symbols to match for this asset
  const symbolsToMatch = ASSET_SYMBOLS[asset] || [asset];
  
  // Filter pools by asset and our supported protocols
  for (const [protocolId, config] of Object.entries(PROTOCOL_CONFIG)) {
    const matchingPools = pools.filter(pool => 
      pool.project === config.defillamaProject &&
      symbolsToMatch.some(sym => pool.symbol.toUpperCase().includes(sym.toUpperCase()))
    );
    
    // Take the highest APY pool for this protocol/asset combo
    if (matchingPools.length > 0) {
      const bestPool = matchingPools.reduce((best, current) => 
        current.apy > best.apy ? current : best
      );
      
      apys.push({
        protocol: protocolId,
        asset,
        baseAPY: (bestPool.apyBase || bestPool.apy) / 100,
        rewardsAPY: (bestPool.apyReward || 0) / 100,
        totalAPY: bestPool.apy / 100,
        tvl: bestPool.tvlUsd,
        utilizationRate: 0.7, // Not available in DefiLlama, using estimate
        lastUpdated: new Date(),
        poolId: bestPool.pool,
        symbol: bestPool.symbol,
      });
    }
  }
  
  return apys;
}

/**
 * Fetch APYs for multiple assets
 */
export async function fetchAllAPYsMultiAsset(): Promise<Map<string, ProtocolAPY[]>> {
  const pools = await fetchDefiLlamaPools();
  const result = new Map<string, ProtocolAPY[]>();
  
  for (const asset of Object.keys(ASSET_SYMBOLS)) {
    const symbolsToMatch = ASSET_SYMBOLS[asset];
    const assetApys: ProtocolAPY[] = [];
    
    for (const [protocolId, config] of Object.entries(PROTOCOL_CONFIG)) {
      const matchingPools = pools.filter(pool =>
        pool.project === config.defillamaProject &&
        symbolsToMatch.some(sym => pool.symbol.toUpperCase().includes(sym.toUpperCase()))
      );
      
      if (matchingPools.length > 0) {
        const bestPool = matchingPools.reduce((best, current) =>
          current.apy > best.apy ? current : best
        );
        
        assetApys.push({
          protocol: protocolId,
          asset,
          baseAPY: (bestPool.apyBase || bestPool.apy) / 100,
          rewardsAPY: (bestPool.apyReward || 0) / 100,
          totalAPY: bestPool.apy / 100,
          tvl: bestPool.tvlUsd,
          utilizationRate: 0.7,
          lastUpdated: new Date(),
          poolId: bestPool.pool,
          symbol: bestPool.symbol,
        });
      }
    }
    
    result.set(asset, assetApys);
  }
  
  return result;
}

/**
 * Calculate risk scores for each protocol
 */
export function calculateRiskScores(apys: ProtocolAPY[]): RiskScore[] {
  return apys.map(apy => {
    const config = PROTOCOL_CONFIG[apy.protocol];
    if (!config) {
      return {
        protocol: apy.protocol,
        tvlScore: 0,
        auditScore: 0,
        ageScore: 0,
        exploitScore: 0,
        totalScore: 50, // Default middle score
      };
    }
    
    // TVL score: higher TVL = safer (max 25 points)
    // $1B+ = 25, $100M = 15, $10M = 10, etc.
    const tvlScore = Math.min(25, Math.log10(Math.max(1, apy.tvl / 1_000_000)) * 8);
    
    // Audit/reputation score from base config (max 25 points)
    const auditScore = (config.riskBase / 100) * 25;
    
    // Age score - all established protocols get high score (max 25 points)
    const ageScore = 20;
    
    // Exploit score - penalize protocols with history (max 25 points)
    const exploitPenalty = config.riskBase < 80 ? 8 : 0;
    const exploitScore = 25 - exploitPenalty;
    
    return {
      protocol: apy.protocol,
      tvlScore: Math.round(tvlScore * 10) / 10,
      auditScore: Math.round(auditScore * 10) / 10,
      ageScore,
      exploitScore,
      totalScore: Math.round((tvlScore + auditScore + ageScore + exploitScore) * 10) / 10,
    };
  });
}

/**
 * Get the best risk-adjusted opportunities
 */
export function rankOpportunities(
  apys: ProtocolAPY[],
  risks: RiskScore[],
  minRiskScore: number = 60
): { protocol: string; totalAPY: number; riskScore: number; riskAdjustedAPY: number }[] {
  const ranked = apys
    .map(apy => {
      const risk = risks.find(r => r.protocol === apy.protocol);
      const riskScore = risk?.totalScore || 50;
      return {
        protocol: apy.protocol,
        totalAPY: apy.totalAPY,
        riskScore,
        // Risk-adjusted APY: APY * (riskScore / 100)
        riskAdjustedAPY: apy.totalAPY * (riskScore / 100),
      };
    })
    .filter(r => r.riskScore >= minRiskScore)
    .sort((a, b) => b.riskAdjustedAPY - a.riskAdjustedAPY);

  return ranked;
}

/**
 * Get a summary of current yields for display
 */
export async function getYieldSummary(asset: string = 'USDC'): Promise<string> {
  const apys = await fetchAllAPYs(asset);
  const risks = calculateRiskScores(apys);
  const ranked = rankOpportunities(apys, risks);

  let summary = `\n📊 ${asset} Yield Opportunities (${new Date().toISOString()})\n`;
  summary += '─'.repeat(60) + '\n';

  for (const opp of ranked) {
    const apy = apys.find(a => a.protocol === opp.protocol);
    summary += `${PROTOCOL_CONFIG[opp.protocol]?.name || opp.protocol}:\n`;
    summary += `  APY: ${(opp.totalAPY * 100).toFixed(2)}% | `;
    summary += `Risk: ${opp.riskScore.toFixed(0)}/100 | `;
    summary += `TVL: $${(apy?.tvl || 0).toLocaleString()}\n`;
    summary += `  Risk-Adjusted APY: ${(opp.riskAdjustedAPY * 100).toFixed(2)}%\n`;
  }

  return summary;
}

// CLI test
if (require.main === module) {
  (async () => {
    console.log('Fetching real-time yields from DefiLlama...\n');
    console.log(await getYieldSummary('USDC'));
    console.log(await getYieldSummary('SOL'));
  })();
}
