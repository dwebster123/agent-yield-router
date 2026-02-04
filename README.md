# Cross-Chain Yield Agent 🤖💰

**A self-sustaining AI agent that earns yield across DeFi protocols to fund its own existence.**

Built for [USDC Agent Hackathon](https://www.circle.com/blog/announcing-the-usdc-agent-hackathon) (Agentic Commerce Track) and [Solana Agent Hackathon 2026](https://colosseum.com/agent-hackathon)

## 🎯 The Vision

What if your AI agent didn't cost you money — **it made money while it worked for you**?

This agent:
1. **Monitors yields** across Solana, Base, Arbitrum, Ethereum
2. **Calculates risk-adjusted returns** factoring in TVL, audits, liquidity
3. **Routes capital via CCTP** using Circle's native cross-chain bridge
4. **Earns yield to sustain itself** — true agentic commerce

## 🔥 Why This Matters

Current AI agents are a **cost center**. You pay for API calls, compute, and infrastructure.

This agent flips the model: **put capital to work, earn yield, become self-sustaining**.

At scale, an agent with $10,000 earning 8% APY generates $800/year — more than enough to cover its own operating costs.

## 🌐 Supported Chains & Protocols

| Chain | Protocols | CCTP Support |
|-------|-----------|--------------|
| **Solana** | Kamino, Loopscale, Jupiter, Drift, MarginFi | ✅ |
| **Base** | Aave, Moonwell, Morpho | ✅ |
| **Arbitrum** | Aave, Radiant | ✅ |
| **Ethereum** | Aave, Compound | ✅ |

## 📊 Live Yield Comparison

```
🌐 Cross-Chain USDC Yield Opportunities
═══════════════════════════════════════════════════

Solana (current chain)
────────────────────────────────────────
  Loopscale       APY:  7.01% | Risk: 80/100 | Cost: $0.00
  Kamino          APY:  2.91% | Risk: 97/100 | Cost: $0.00

Base 
────────────────────────────────────────
  Aave            APY:  3.90% | Risk: 100/100 | Cost: $1.05

Arbitrum 
────────────────────────────────────────
  Radiant         APY:  8.16% | Risk: 72/100 | Cost: $1.10
  Aave            APY:  2.27% | Risk: 100/100 | Cost: $1.10
```

## 🧠 Decision Engine

The agent makes intelligent decisions based on:

### Risk Scoring
- **TVL Factor**: Higher TVL = lower risk
- **Protocol Reputation**: Audit status, age, exploit history
- **Liquidity Risk**: How easily can you exit?
- **Strategy Type**: Lending (safest) → Vault → LP (riskiest)

### Cost Analysis
- Bridge costs via CCTP
- Gas costs per chain
- Minimum hold period to break even

### Risk Profiles
- **Conservative**: Lending only, established protocols
- **Moderate**: Include vaults, medium-risk strategies  
- **Aggressive**: All opportunities including LP positions

## 🚀 Quick Start

```bash
# Install
git clone https://github.com/yourusername/cross-chain-yield-agent
cd cross-chain-yield-agent
npm install

# Run yield analysis
npm run yields

# Run the agent (dry run)
npx ts-node src/yield-agent.ts 1000 moderate

# Run with execution (requires Bankr setup)
npx ts-node src/yield-agent.ts 1000 moderate --execute
```

## 📋 Commands

```bash
# Show cross-chain yield opportunities
npx ts-node src/multichain-monitor.ts

# Run agent with specific principal and risk profile
npx ts-node src/yield-agent.ts <principal> <risk-profile>

# Example: $500 conservative
npx ts-node src/yield-agent.ts 500 conservative

# Example: $2000 aggressive  
npx ts-node src/yield-agent.ts 2000 aggressive
```

## 💰 Self-Sustainability Analysis

The agent calculates when it becomes economically autonomous:

```
💰 SELF-SUSTAINABILITY REPORT
══════════════════════════════════════════════════
Principal: $1000
Current APY: 7.01%

Daily yield: $0.19
Daily operating cost: $0.10
Net daily: $0.09

✅ SELF-SUSTAINING
Monthly profit: $2.74
Annual profit: $32.85
```

**Break-even point**: ~$521 principal at 7% APY

## 🔧 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                   CROSS-CHAIN YIELD AGENT                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐       │
│  │  Multi-Chain│     │  Risk &     │     │  Execution  │       │
│  │  APY Monitor│────▶│  Decision   │────▶│  Engine     │       │
│  │  (DefiLlama)│     │  Engine     │     │  (Bankr)    │       │
│  └─────────────┘     └─────────────┘     └─────────────┘       │
│        │                   │                   │               │
│        ▼                   ▼                   ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Circle CCTP Bridge Layer                    │   │
│  │    Solana ←──→ Base ←──→ Arbitrum ←──→ Ethereum        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                 Protocol Integrations                    │   │
│  │  Kamino │ Loopscale │ Aave │ Moonwell │ Morpho │ Radiant│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🛣️ Roadmap

### Phase 1 (Current) ✅
- Multi-chain yield monitoring
- Risk-adjusted opportunity ranking
- Dry-run execution planning
- Self-sustainability calculations

### Phase 2 (In Progress)
- Full Bankr execution integration
- CCTP bridge automation
- Real-time rebalancing

### Phase 3 (Future)
- Looping/multiply strategies (Jupiter Multiply)
- Delta-neutral yield farming
- Collateral optimization (borrow → deploy → earn)

## 🔗 Circle CCTP Integration

This agent leverages Circle's Cross-Chain Transfer Protocol (CCTP) for native USDC transfers:

- **No wrapped tokens**: True 1:1 USDC across chains
- **Permissionless**: Anyone can bridge
- **Fast**: ~15 minutes for EVM chains
- **Supported chains**: Solana, Base, Ethereum, Arbitrum, Polygon, Avalanche

## 🤝 Bankr Integration

Execution powered by [Bankr](https://bankr.bot):
- Natural language DeFi operations
- Multi-chain support
- Bridge automation
- Portfolio management

## 📄 License

MIT

---

**Built with ❤️ for the USDC Agent Hackathon**

*"The future isn't agents that cost money — it's agents that make money."*
