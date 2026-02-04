/**
 * Cross-Chain Yield Executor
 * Uses Bankr API for bridging and DeFi operations
 */

import { ChainId, CHAIN_CONFIG } from './chains';
import { CrossChainOpportunity } from './multichain-monitor';
import * as fs from 'fs';
import * as path from 'path';

// Bankr API configuration
interface BankrConfig {
  apiKey: string;
  apiUrl: string;
}

interface BankrJobResponse {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  response?: string;
  error?: string;
}

/**
 * Load Bankr configuration
 */
function loadBankrConfig(): BankrConfig | null {
  try {
    const configPath = path.join(
      process.env.HOME || '~',
      '.clawdbot/skills/bankr/config.json'
    );
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config;
  } catch (error) {
    console.error('Bankr config not found. Please set up Bankr first.');
    return null;
  }
}

/**
 * Submit a prompt to Bankr API
 */
async function submitBankrPrompt(prompt: string): Promise<BankrJobResponse | null> {
  const config = loadBankrConfig();
  if (!config) return null;

  try {
    const response = await fetch(`${config.apiUrl}/agent/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Bankr API error: ${response.status}`);
    }

    return await response.json() as BankrJobResponse;
  } catch (error) {
    console.error('Bankr API error:', error);
    return null;
  }
}

/**
 * Poll for job completion
 */
async function waitForJob(jobId: string, timeoutMs: number = 60000): Promise<BankrJobResponse | null> {
  const config = loadBankrConfig();
  if (!config) return null;

  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const response = await fetch(`${config.apiUrl}/agent/job/${jobId}`, {
        headers: {
          'x-api-key': config.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Bankr API error: ${response.status}`);
      }

      const job = await response.json() as BankrJobResponse;
      
      if (job.status === 'completed' || job.status === 'failed') {
        return job;
      }

      // Wait 2 seconds before polling again
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error('Bankr polling error:', error);
      return null;
    }
  }

  return null; // Timeout
}

/**
 * Execute a Bankr command and wait for result
 */
async function executeBankr(prompt: string): Promise<string | null> {
  console.log(`\n📤 Sending to Bankr: "${prompt}"`);
  
  const job = await submitBankrPrompt(prompt);
  if (!job) return null;

  console.log(`⏳ Job submitted: ${job.jobId}`);
  
  const result = await waitForJob(job.jobId);
  if (!result) {
    console.log('❌ Job timed out');
    return null;
  }

  if (result.status === 'failed') {
    console.log(`❌ Job failed: ${result.error}`);
    return null;
  }

  console.log(`✅ Job completed`);
  return result.response || null;
}

/**
 * Get current USDC balance on a chain
 */
export async function getBalance(chain: ChainId): Promise<number | null> {
  const chainName = CHAIN_CONFIG[chain].name;
  const prompt = `What is my USDC balance on ${chainName}?`;
  
  const response = await executeBankr(prompt);
  if (!response) return null;

  // Parse balance from response
  const match = response.match(/(\d+(?:,\d{3})*(?:\.\d+)?)\s*USDC/i);
  if (match) {
    return parseFloat(match[1].replace(/,/g, ''));
  }

  return null;
}

/**
 * Bridge USDC from one chain to another
 */
export async function bridgeUSDC(
  fromChain: ChainId,
  toChain: ChainId,
  amount: number
): Promise<boolean> {
  const fromName = CHAIN_CONFIG[fromChain].name;
  const toName = CHAIN_CONFIG[toChain].name;
  
  const prompt = `Bridge ${amount} USDC from ${fromName} to ${toName}`;
  
  const response = await executeBankr(prompt);
  return response !== null && !response.toLowerCase().includes('error');
}

/**
 * Deposit USDC into a protocol
 * Note: Most DeFi deposits aren't directly supported by Bankr,
 * this is a placeholder for the execution layer
 */
export async function depositToProtocol(
  chain: ChainId,
  protocol: string,
  amount: number
): Promise<boolean> {
  // Bankr doesn't directly support DeFi deposits
  // This would need to be handled via:
  // 1. Bankr's arbitrary transaction feature
  // 2. Direct protocol SDK integration
  // 3. Aggregator like Zapper/Yearn
  
  console.log(`\n⚠️ Direct protocol deposits not yet implemented`);
  console.log(`   Would deposit ${amount} USDC to ${protocol} on ${CHAIN_CONFIG[chain].name}`);
  console.log(`   For hackathon demo: showing recommendation only`);
  
  return false;
}

/**
 * Execute a yield routing action
 */
export async function executeYieldRoute(
  opportunity: CrossChainOpportunity,
  currentChain: ChainId,
  amount: number,
  dryRun: boolean = true
): Promise<{ success: boolean; message: string }> {
  const needsBridge = opportunity.chain !== currentChain;
  
  console.log('\n' + '═'.repeat(50));
  console.log('🚀 EXECUTING YIELD ROUTE');
  console.log('═'.repeat(50));
  console.log(`From: ${CHAIN_CONFIG[currentChain].name}`);
  console.log(`To: ${opportunity.protocol} on ${CHAIN_CONFIG[opportunity.chain].name}`);
  console.log(`Amount: $${amount} USDC`);
  console.log(`Expected APY: ${(opportunity.apy * 100).toFixed(2)}%`);
  console.log(`Dry run: ${dryRun}`);
  console.log('─'.repeat(50));

  if (dryRun) {
    console.log('\n📋 DRY RUN - Actions that would be taken:\n');
    
    if (needsBridge) {
      console.log(`1. Bridge ${amount} USDC from ${CHAIN_CONFIG[currentChain].name} to ${CHAIN_CONFIG[opportunity.chain].name}`);
      console.log(`   Cost: ~$${opportunity.bridgeCostUSD.toFixed(2)}`);
      console.log(`   Time: ~${CHAIN_CONFIG[opportunity.chain].bridgeTimeMinutes} minutes\n`);
    }
    
    console.log(`${needsBridge ? '2' : '1'}. Deposit ${amount} USDC into ${opportunity.protocol}`);
    console.log(`   Gas cost: ~$${opportunity.gasCostUSD.toFixed(2)}\n`);
    
    console.log('📊 Expected Returns:');
    console.log(`   30-day return: $${(amount * opportunity.apy / 12).toFixed(2)}`);
    console.log(`   Annual return: $${(amount * opportunity.apy).toFixed(2)}`);
    console.log(`   Total cost: $${opportunity.totalCostUSD.toFixed(2)}`);
    console.log(`   Break-even: ${opportunity.minHoldDays} days`);
    
    return {
      success: true,
      message: 'Dry run completed. Set dryRun=false to execute.',
    };
  }

  // Real execution
  try {
    // Step 1: Check balance
    console.log('\n1️⃣ Checking current balance...');
    const balance = await getBalance(currentChain);
    if (balance === null) {
      return { success: false, message: 'Could not fetch balance' };
    }
    console.log(`   Balance: ${balance} USDC`);

    if (balance < amount) {
      return { success: false, message: `Insufficient balance: ${balance} < ${amount}` };
    }

    // Step 2: Bridge if needed
    if (needsBridge) {
      console.log('\n2️⃣ Bridging USDC...');
      const bridged = await bridgeUSDC(currentChain, opportunity.chain, amount);
      if (!bridged) {
        return { success: false, message: 'Bridge failed' };
      }
      console.log('   Bridge initiated');
    }

    // Step 3: Deposit (not fully implemented)
    console.log('\n3️⃣ Depositing to protocol...');
    const deposited = await depositToProtocol(opportunity.chain, opportunity.protocol, amount);
    if (!deposited) {
      return { 
        success: true, 
        message: 'Funds bridged. Manual deposit required (not yet automated).' 
      };
    }

    return { success: true, message: 'Yield route executed successfully' };
  } catch (error) {
    return { success: false, message: `Error: ${error}` };
  }
}

/**
 * Self-sustaining agent: Calculate if yields cover operating costs
 */
export function calculateSelfSustainability(
  principal: number,
  apy: number,
  dailyOperatingCost: number = 0.10  // Estimated API/compute cost per day
): {
  dailyYield: number;
  dailyCost: number;
  netDaily: number;
  isSustainable: boolean;
  daysToSustainability: number;
  monthlyProfit: number;
} {
  const dailyYield = (principal * apy) / 365;
  const netDaily = dailyYield - dailyOperatingCost;
  const isSustainable = netDaily > 0;
  
  // Days to earn enough to cover operating costs if not yet sustainable
  const daysToSustainability = !isSustainable && dailyYield > 0
    ? Math.ceil(dailyOperatingCost / dailyYield)
    : 0;

  return {
    dailyYield,
    dailyCost: dailyOperatingCost,
    netDaily,
    isSustainable,
    daysToSustainability,
    monthlyProfit: netDaily * 30,
  };
}

// CLI test
if (require.main === module) {
  (async () => {
    // Test balance check
    console.log('Testing Bankr integration...\n');
    const balance = await getBalance('solana');
    console.log(`Solana USDC balance: ${balance}`);
    
    // Test sustainability calculation
    console.log('\n📊 Self-Sustainability Analysis:');
    const sustainability = calculateSelfSustainability(100, 0.08, 0.10);
    console.log(`Principal: $100 at 8% APY`);
    console.log(`Daily yield: $${sustainability.dailyYield.toFixed(4)}`);
    console.log(`Daily cost: $${sustainability.dailyCost.toFixed(2)}`);
    console.log(`Net daily: $${sustainability.netDaily.toFixed(4)}`);
    console.log(`Sustainable: ${sustainability.isSustainable}`);
    
    if (!sustainability.isSustainable) {
      console.log(`Days to sustainability: ${sustainability.daysToSustainability}`);
    } else {
      console.log(`Monthly profit: $${sustainability.monthlyProfit.toFixed(2)}`);
    }
  })();
}
