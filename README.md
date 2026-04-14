# AlgoCreFi - Permissionless Lending Protocol on Algorand

<p align="center">
  <img src="https://img.shields.io/badge/Network-Testnet-00FFD1?style=for-the-badge" alt="Testnet" />
  <img src="https://img.shields.io/badge/Smart%20Contract-ARC56-7B2FFF?style=for-the-badge" alt="ARC56" />
  <img src="https://img.shields.io/badge/Platform-Algorand-05050A?style=for-the-badge&color=00FFD1" alt="Algorand" />
</p>

> **Lend. Earn. On-chain.**  
> A permissionless algorithmic lending protocol built on Algorand, featuring collateralized loans, AURA credit scoring, and unsecured lending.

## 💡 Vision

**The Problem:**  
Over 200 million blockchain users hold stablecoins as their primary digital asset, yet face a critical liquidity gap. When they need cash for everyday needs—a cup of coffee, emergency expenses—they must either sell their assets (triggering taxable events) or lack access entirely, as traditional financial products require credit cards, bank accounts, and identity verification.

**Our Solution:**  
AlgoCreFi is a decentralized, non-custodial pool-based micro-lending platform where your wallet address is your identity. Users can:
- Instantly borrow ALGO by collateralizing stablecoins (USDC) at 150% LTV
- Build an on-chain credit reputation ("AURA") through responsible repayment
- Access collateral-free unsecured loans once their AURA score reaches 30 points
- Earn yield by depositing ALGO into the liquidity pool

**Key Differentiators:**
- **Truly Anonymous** - No KYC, wallet address is the only identity
- **Instant Loans** - Borrow in seconds, not days
- **No Peer-to-Peer** - Decentralized pool model ensures instant liquidity
- **Automated Risk Management** - Smart contracts handle defaults via Tinyman DEX integration

**Vision:** Democratize access to liquidity while preserving asset ownership and financial privacy.

## 📺 Demo Video

[![AlgoCreFi Demo](https://img.youtube.com/vi/muDi6-bxl84/0.jpg)](https://youtu.be/muDi6-bxl84)

*Watch the complete project walkthrough on [YouTube](https://youtu.be/muDi6-bxl84)*

## 🔗 Live Links

| Service | URL |
|---------|-----|
| **Frontend (Vercel)** | https://algocrefi.vercel.app |
| **Backend (Render)** | https://algocrefi-backend-bdm0.onrender.com |
| **Smart Contract** | https://lora.algokit.io/testnet/application/758675636 |

## 🌟 Features

### Core Protocol

- **Liquidity Pool** - Deposit ALGO to earn yield through automated market-making
- **Collateralized Loans** - Borrow ALGO using USDC as collateral at 150% LTV
- **AURA Credit System** - Build on-chain credit reputation through loan repayment
- **Unsecured Loans** - Access collateral-free loans once AURA score reaches 30 points
- **Automated Liquidation** - Smart contract handles default liquidation with Tinyman DEX integration

### Technical Features

- **ARC56 Compliance** - All smart contracts follow Algorand's latest ABI standard
- **ARC4 Encoding** - Standardized method calling for interoperability
- **Group Transactions** - Atomic operations for complex lending workflows
- **Real-time Market Data** - Live OHLC candles, price feeds, and pool analytics
- **Multi-Wallet Support** - Pera Wallet, Lute Wallet integration

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         AlgoCreFi Ecosystem                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐      │
│   │ AlgocrefiVault│     │  AlgocrefiAura│     │  AlgoPool   │      │
│   │  (Hold ALGO) │     │ (Credit Score)│     │ (Lending)   │      │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘      │
│          │                    │                    │             │
│          └────────────────────┴────────────────────┘             │
│                               │                                   │
│                               ▼                                   │
│                    ┌──────────────────┐                           │
│                    │ AlgocrefiLending │                           │
│                    │  (User-facing)   │                           │
│                    └──────────────────┘                           │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐    │
│   │                    Backend API                            │    │
│   │  Express.js + MongoDB + Algorand SDK + Tinyman SDK        │    │
│   └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐    │
│   │                   Next.js Frontend                         │    │
│   │  React 19 + TypeScript + Tailwind CSS 4                   │    │
│   └──────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
AlgoCreFi-hackseries/
├── algocrefi-backend/          # Backend API (Express.js)
│   ├── src/
│   │   ├── configs/           # Algorand & database configuration
│   │   ├── controllers/       # Route handlers
│   │   ├── services/          # Business logic
│   │   ├── routes/            # API endpoints
│   │   ├── middlewares/      # Auth & validation
│   │   ├── models/           # MongoDB schemas
│   │   └── jobs/             # Scheduled tasks
│   └── index.js              # Entry point
│
├── algocrefi-frontend/         # Frontend (Next.js 15)
│   ├── app/
│   │   ├── page.tsx          # Landing page
│   │   └── dashboard/        # Protected dashboard
│   ├── components/
│   │   ├── dashboard/        # Dashboard UI components
│   │   └── *.tsx             # Landing page components
│   └── src/utils/            # API clients & services
│
└── algocrefi-contract/        # Smart Contracts (Algorand Python)
    └── projects/
        └── algocrefi-contract/
            └── smart_contracts/
                ├── algocrefi_pool/      # Core lending pool
                ├── algocrefi_lending/   # Lending interface
                ├── algocrefi_vault/     # ALGO vault
                └── algocrefi_aura/     # Credit scoring
```

## 🔐 Smart Contracts

### AlgoPool (ID: 758675636)

Core lending pool handling deposits, withdrawals, and loans.

| Parameter | Value |
|-----------|-------|
| **Daily Interest** | 10 bps (0.1%) |
| **Collateral Ratio** | 150% LTV |
| **USDC Asset ID** | 10458941 (testnet) |
| **Min AURA for Unsecured** | 30 points |
| **Unsecured Credit Limit** | 10% of net AURA |

**Key Methods:**
- `opt_in()` - User registration
- `deposit(payment_txn_index)` - Deposit ALGO, receive shares
- `withdraw(share_amount)` - Burn shares, receive ALGO
- `request_collateral_loan(algo_amount, days, min_usdc, collateral_txn)` - Borrow with USDC
- `request_unsecured_loan(algo_amount, days)` - Borrow using AURA credit
- `repay(payment_txn_index)` - Repay loan + interest
- `liquidate_default(borrower)` - Liquidate overdue loans

### AlgocrefiAura

Credit scoring contract tracking user reputation.

**Local State per User:**
- `aura_earned` - Points from successful repayments
- `aura_penalty` - Penalty from defaults
- `blacklisted` - Unsecured access flag

### AlgocrefiVault

Simple ALGO vault for protocol fund management.

### AlgocrefiLending

User-facing lending interface that delegates to AlgoPool with group transaction support.

## 💰 Lending Mechanics

### Collateralized Loans

```
User deposits USDC (150% of borrow amount)
         ↓
Borrows ALGO from pool
         ↓
Pays back ALGO + 0.1% daily interest
         ↓
Recovers USDC collateral
         ↓
Earns AURA points based on interest paid
```

### Unsecured Loans (AURA-Based)

```
Net AURA Score ≥ 30 points
         ↓
Credit limit = 10% of net AURA
         ↓
Borrow ALGO without collateral
         ↓
Repay with interest
         ↓
Build more AURA for higher limits
```

### AURA Calculation

```
Net AURA = AURA Earned - AURA Penalty

1 AURA = 1,000,000 microAlgos of interest paid
```

## 🌐 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register with wallet address |
| POST | `/api/auth/login` | Login, receive JWT |

### Pool Operations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/pool/pool-info` | No | Get global pool stats |
| GET | `/api/pool/user-info` | Yes | Get user's shares |
| POST | `/api/pool/opt-in` | Yes | Opt-in to pool |
| POST | `/api/pool/deposit` | Yes | Deposit ALGO |
| POST | `/api/pool/withdraw` | Yes | Withdraw ALGO |

### Lending
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/loan/status` | Yes | Get user's loan status |
| POST | `/api/loan/collateral/quote` | Yes | Get loan quote |
| POST | `/api/loan/collateral/request` | Yes | Request collateral loan |
| POST | `/api/loan/unsecured/request` | Yes | Request unsecured loan |
| POST | `/api/loan/repay` | Yes | Repay loan |

### Market Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/market/ohlc` | OHLC price candles |
| GET | `/api/market/stats` | Market statistics |
| GET | `/api/market/pool-snapshot` | Tinyman pool data |

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB
- **Blockchain**: Algorand SDK v3.5.2
- **DEX**: Tinyman JS SDK v5.1.4
- **Auth**: JWT + bcrypt

### Frontend
- **Framework**: Next.js 15 (App Router)
- **UI**: React 19
- **Styling**: Tailwind CSS 4 + inline styles
- **Charts**: lightweight-charts v4.2.0
- **Wallet**: Pera Connect, Lute Connect

### Smart Contracts
- **Language**: Algorand Python (Puya)
- **Framework**: AlgoKit 4.0
- **Standards**: ARC56, ARC4

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- pnpm/npm
- Algorand Testnet wallet (Pera or Lute)

### Backend Setup

```bash
cd algocrefi-backend
pnpm install

# Create .env file with required variables:
# MONGO_URI, JWT_SECRET, ALGOD_TOKEN, MNEMONIC,
# POOL_APP_ID, LENDING_APP_ID, USDC_ASA_ID, etc.

pnpm start
```

### Frontend Setup

```bash
cd algocrefi-frontend
pnpm install

# Create .env.local:
# NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

pnpm dev
```

### Smart Contract Deployment

```bash
cd algocrefi-contract/projects/algocrefi-contract

# Build contracts
algokit project run build

# Deploy to testnet
algokit project deploy testnet
```

## 👥 Team Bengal Tigers

| Member | Role | GitHub |
|--------|------|--------|
| **Debasmit Bose** (Leader) | Fullstack Developer | [@donendosted](https://github.com/donendosted) |
| **Anubhab Rakshit** | Smart Contract Developer | [@Anubhab-Rakshit](https://github.com/Anubhab-Rakshit) |
| **Bodhisatwa Dutta** | Backend Developer | [@bDutta18](https://github.com/bDutta18) |
| **Rupam Ghosh** | Frontend Developer | [@rupamghosh2006](https://github.com/rupamghosh2006) |

## 📊 Protocol Statistics

| Metric | Value |
|--------|-------|
| **Network** | Algorand Testnet |
| **Daily Interest** | 0.1% |
| **Collateral Ratio** | 150% LTV |
| **Unsecured Threshold** | 30 AURA |
| **Smart Contract** | 758675636 |
| **USDC Asset** | 10458941 |

## 🔒 Security

- All smart contracts follow ARC56/ARC4 standards
- JWT-based authentication with bcrypt password hashing
- Transaction verification via Algorand Indexer
- Automated default liquidation prevents bad debt accumulation
- Contract audit logs on Algorand blockchain

## 📄 License

MIT License - See LICENSE file for details.

---

<p align="center">
  Built with ❤️ by <strong>Team Bengal Tigers</strong> for Hack Series 3
</p>
