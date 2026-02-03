/**
 * Voltr Yield Optimizer - CLI Entry Point
 * 
 * Commands:
 *   monitor  - Start continuous monitoring loop
 *   once     - Run single analysis cycle
 *   report   - Generate status report
 *   yields   - Show current market yields
 */

import { YieldOptimizerAgent } from './agent';
import { AgentConfig } from './types';
import { getYieldSummary } from './apy-monitor';
import * as dotenv from 'dotenv';

dotenv.config();

// Default configuration
const DEFAULT_CONFIG: AgentConfig = {
  // Risk parameters
  maxAllocationPerProtocol: 0.4,       // Max 40% in any single protocol
  minProtocolsForDiversity: 3,         // At least 3 protocols
  minRiskScore: 60,                    // Only use protocols with score >= 60
  
  // Rebalance parameters
  minAPYDifferenceToRebalance: 0.02,   // Need 2%+ improvement to rebalance
  minTimeBetweenRebalances: 3600,      // 1 hour minimum between rebalances
  maxGasCostForRebalance: 5,           // Max $5 in gas
  
  // Vault settings (from environment or defaults)
  vaultPubkey: process.env.VAULT_PUBKEY || '11111111111111111111111111111111',
  managerKeypair: process.env.MANAGER_KEYPAIR_PATH || './keypair.json',
  rpcUrl: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
};

async function runMonitor(config: AgentConfig, dryRun: boolean) {
  const agent = new YieldOptimizerAgent(config, dryRun);
  const intervalMs = parseInt(process.env.CHECK_INTERVAL_MS || '60000');
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nReceived SIGINT, shutting down gracefully...');
    agent.stop();
    process.exit(0);
  });
  
  await agent.start(intervalMs);
}

async function runOnce(config: AgentConfig) {
  const agent = new YieldOptimizerAgent(config, true);
  const decision = await agent.runCycle();
  
  console.log('\n📊 Analysis Complete');
  console.log(`Should rebalance: ${decision.shouldRebalance}`);
  console.log(`Reason: ${decision.reason}`);
  
  if (decision.shouldRebalance) {
    console.log(`Expected APY improvement: +${(decision.expectedAPYImprovement * 100).toFixed(2)}%`);
    console.log('Proposed changes:');
    for (const change of decision.proposedChanges) {
      console.log(`  - Move $${change.from.amount.toLocaleString()} from ${change.from.protocol} to ${change.to.protocol}`);
    }
  }
}

async function generateReport(config: AgentConfig) {
  const agent = new YieldOptimizerAgent(config, true);
  const report = await agent.getStatusReport();
  console.log(report);
}

async function showYields() {
  console.log('Fetching live market yields...\n');
  
  console.log(await getYieldSummary('USDC'));
  console.log(await getYieldSummary('SOL'));
}

// CLI
const command = process.argv[2] || 'help';
const dryRun = process.env.DRY_RUN !== 'false';

console.log(`
╔═══════════════════════════════════════════════════════════╗
║           Voltr Yield Optimizer Agent v1.0.0              ║
║           AI-Powered DeFi Yield Optimization              ║
╚═══════════════════════════════════════════════════════════╝
`);

(async () => {
  switch (command) {
    case 'monitor':
      console.log('Starting continuous monitoring...\n');
      await runMonitor(DEFAULT_CONFIG, dryRun);
      break;
      
    case 'once':
      console.log('Running single analysis cycle...\n');
      await runOnce(DEFAULT_CONFIG);
      break;
      
    case 'report':
      console.log('Generating status report...\n');
      await generateReport(DEFAULT_CONFIG);
      break;
      
    case 'yields':
      await showYields();
      break;
      
    case 'help':
    default:
      console.log(`
Usage: npx ts-node src/index.ts <command>

Commands:
  monitor   Start continuous monitoring and rebalancing loop
  once      Run a single analysis cycle
  report    Generate comprehensive status report
  yields    Show current market yields across protocols

Environment Variables:
  DRY_RUN              Set to 'false' to enable live transactions (default: true)
  VAULT_PUBKEY         Your Voltr vault address
  MANAGER_KEYPAIR_PATH Path to manager keypair JSON file
  RPC_URL              Solana RPC endpoint
  CHECK_INTERVAL_MS    Monitoring interval in ms (default: 60000)

Examples:
  npx ts-node src/index.ts yields              # Check current yields
  DRY_RUN=true npx ts-node src/index.ts once   # Test analysis
  DRY_RUN=false npx ts-node src/index.ts monitor  # Live trading

Built for Solana Agent Hackathon 2026 🏆
`);
      break;
  }
})().catch(console.error);
