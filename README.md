# Voltr Yield Optimizer 🤖💰

**AI-powered yield optimization agent for Solana**

Built for the [Solana Agent Hackathon 2026](https://colosseum.com/agent-hackathon) 

## What It Does

An autonomous AI agent that manages [Voltr](https://voltr.xyz) vault allocations to maximize yield while respecting risk parameters. It continuously monitors APYs across Solana DeFi protocols and automatically rebalances to capture the best risk-adjusted returns.

### Key Features

- 📊 **Real-time APY Monitoring** — Live data from DefiLlama across 7+ Solana protocols
- 🧠 **Risk-Adjusted Decision Making** — Weighs returns against protocol safety (TVL, audits, age, exploit history)
- 🔄 **Automatic Rebalancing** — Moves capital to optimal strategies when improvement exceeds threshold
- 📈 **Performance Reporting** — Detailed status reports with live market data
- ⚙️ **Configurable Risk Parameters** — Tune to your risk tolerance

## Live Yields (Real-Time)

```
USDC:
├─ Loopscale: 7.06% APY (risk-adjusted: 4.36%)
└─ Kamino: 3.23% APY (risk-adjusted: 2.59%)

SOL (LSTs):
├─ Jupiter: 6.52% APY (risk-adjusted: 5.78%)
├─ Drift: 6.53% APY (risk-adjusted: 5.47%)
├─ Jito: 5.89% APY (risk-adjusted: 5.45%)
├─ Kamino: 6.06% APY (risk-adjusted: 4.80%)
├─ Marinade: 5.26% APY (risk-adjusted: 4.56%)
└─ Save: 2.11% APY (risk-adjusted: 1.34%)
```

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    YIELD OPTIMIZER AGENT                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │  APY        │     │  Strategy   │     │  Voltr      │   │
│  │  Monitor    │────▶│  Brain      │────▶│  Executor   │   │
│  │  (Live)     │     │  (AI)       │     │             │   │
│  └─────────────┘     └─────────────┘     └─────────────┘   │
│        │                   │                   │           │
│        ▼                   ▼                   ▼           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Protocol Integrations                   │   │
│  │  Kamino │ Loopscale │ Jito │ Jupiter │ Drift │ Save │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Decision Logic

1. **Fetch Live APYs** — Gets current rates from DefiLlama aggregator
2. **Calculate Risk Scores** — Scores each protocol based on TVL, audits, age, exploit history
3. **Rank Opportunities** — Sorts by risk-adjusted APY (APY × risk score)
4. **Determine Optimal Allocation** — Inverse-risk-weighted with max caps and diversity requirements
5. **Evaluate Rebalance** — Only rebalances if improvement > threshold and gas is reasonable
6. **Execute** — Withdraws from underperformers, deposits to top performers via Voltr SDK

## Quick Start

```bash
# Clone and install
git clone https://github.com/yourusername/voltr-yield-optimizer
cd voltr-yield-optimizer
npm install

# Check current yields
npm run yields

# Run single analysis (dry-run)
npm run once

# Generate status report
npm run report

# Start monitoring (dry-run by default)
npm run dev
```

## CLI Commands

```bash
npx ts-node src/index.ts <command>

Commands:
  monitor   Start continuous monitoring and rebalancing loop
  once      Run a single analysis cycle
  report    Generate comprehensive status report
  yields    Show current market yields across protocols
```

## Configuration

Edit `.env` or pass as environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `RPC_URL` | Solana RPC endpoint | mainnet-beta |
| `VAULT_PUBKEY` | Your Voltr vault address | — |
| `MANAGER_KEYPAIR_PATH` | Path to manager keypair | ./keypair.json |
| `DRY_RUN` | Skip transaction execution | true |
| `CHECK_INTERVAL_MS` | Monitoring interval | 60000 |

### Risk Parameters (in code)

```typescript
{
  maxAllocationPerProtocol: 0.4,     // Max 40% in any single protocol
  minProtocolsForDiversity: 3,       // At least 3 protocols
  minRiskScore: 60,                  // Only use protocols with score >= 60
  minAPYDifferenceToRebalance: 0.02, // Need 2%+ improvement to rebalance
  minTimeBetweenRebalances: 3600,    // 1 hour minimum between rebalances
  maxGasCostForRebalance: 5,         // Max $5 in gas
}
```

## Supported Protocols

| Protocol | Type | TVL | Risk Tier | Status |
|----------|------|-----|-----------|--------|
| Jito | LST | $1.5B | Safe | ✅ Live |
| Jupiter | LST | $500M | Safe | ✅ Live |
| Marinade | LST | $350M | Safe | ✅ Live |
| Drift | LST/Lending | $186M | Medium | ✅ Live |
| Kamino | Lending | $46M | Safe | ✅ Live |
| Loopscale | Lending | $5M | Medium | ✅ Live |
| Save (Solend) | Lending | $11M | Medium | ✅ Live |

## Project Structure

```
src/
├── index.ts          # CLI entry point
├── agent.ts          # Main agent orchestration
├── strategy-brain.ts # AI decision-making logic
├── apy-monitor.ts    # Real-time APY fetching (DefiLlama)
├── voltr-client.ts   # Voltr SDK integration
├── protocols.ts      # Protocol registry
└── types.ts          # TypeScript definitions
```

## Tech Stack

- **DefiLlama API** — Aggregated yield data across chains
- **Voltr SDK** — Vault management and strategy execution
- **Solana Agent Kit** — Foundation for Solana protocol interactions
- **TypeScript** — Type-safe implementation
- **Solana/web3.js** — Blockchain interaction

## Roadmap

- [x] Core architecture
- [x] Real-time APY monitoring (DefiLlama)
- [x] Risk scoring system
- [x] Rebalancing decision logic
- [x] CLI with yields/report/once commands
- [ ] Full Voltr SDK execution (in progress)
- [ ] Natural language reporting via LLM
- [ ] Telegram/Discord notifications
- [ ] Backtesting framework
- [ ] Forum post submission

## Hackathon Info

- **Event:** Solana Agent Hackathon 2026
- **Deadline:** February 12, 2026
- **Prize Pool:** $100,000
- **Claim Code:** d17ce4b0-f171-4bf4-8133-ee194e280dee

## License

MIT

---

Built with 🦀 by NixKV for the Solana Agent Hackathon
