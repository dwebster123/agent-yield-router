# USDC Hackathon Submission

**Track:** Agentic Commerce

**Project:** Cross-Chain Yield Agent

---

## The Problem

AI agents cost money to run — API calls, compute, infrastructure. Every agent is a cost center.

## The Solution

**An agent that earns its own keep.**

This autonomous yield routing agent:
- Monitors DeFi yields across Solana, Base, Arbitrum, Ethereum
- Calculates risk-adjusted returns (TVL, audits, liquidity)
- Routes capital via **Circle CCTP** for native cross-chain transfers
- Earns yield to cover its own operating costs

## Why USDC + CCTP?

USDC is the settlement layer for agent commerce. CCTP enables frictionless capital movement across chains — no wrapped tokens, no fragmented liquidity.

When the agent spots 8% APY on Arbitrum vs 3% on Solana, it bridges USDC via CCTP and captures the spread. **True cross-chain yield optimization.**

## Self-Sustainability Math

| Principal | APY | Daily Yield | Operating Cost | Net/Day |
|-----------|-----|-------------|----------------|---------|
| $500 | 7% | $0.10 | $0.10 | Break-even |
| $1,000 | 7% | $0.19 | $0.10 | +$0.09 |
| $5,000 | 7% | $0.96 | $0.10 | +$0.86 |

At $730+ principal earning 5% APY, the agent is **fully self-sustaining**.

## Live Demo Output

```
🤖 YIELD AGENT ANALYSIS
════════════════════════════════════════════════════════════
Current chain: Solana
Principal: $1000
Risk profile: moderate

📡 Cross-Chain USDC Yields:
  Loopscale (Solana):  7.01% | Risk: 80/100 | Cost: $0
  Radiant (Arbitrum):  8.16% | Risk: 72/100 | Cost: $1.10
  Aave (Base):         3.90% | Risk: 100/100 | Cost: $1.05
  Kamino (Solana):     2.91% | Risk: 97/100 | Cost: $0

🎯 RECOMMENDATION: Loopscale on Solana
   APY: 7.01%
   Risk-Adjusted: 5.60%
   No bridge needed — optimal for position size

💰 SELF-SUSTAINING: Yes
   Monthly profit: $4.83
```

## Technical Stack

- **Yield Data:** DefiLlama aggregated feeds
- **Risk Engine:** Custom scoring (TVL, audits, liquidity, strategy type)
- **Bridging:** Circle CCTP (Solana ↔ EVM)
- **Execution:** Bankr API
- **Language:** TypeScript

## Repo

https://github.com/dwebster123/agent-yield-router

## What's Next

1. Full execution automation (not just dry-run)
2. Looping strategies (Jupiter Multiply, leveraged yield)
3. Collateral optimization (borrow against assets → deploy → stack returns)

---

**The future isn't agents that cost money — it's agents that make money.**

#USDCHackathon #AgenticCommerce
