<img width="1600" height="555" alt="AlgoCrefi" src="https://github.com/user-attachments/assets/b8c68073-0996-4ed5-9585-440739b783bb" />

AlgoCrefi is a decentralised, non-custodial pool-based over-collateral as well as under-collateral credit platform. Investors diposit cryptocurrency in the pool expecting profit when the value of the pool increses by borrowers paying back with the interest they hold. Borrowers get instant loans based on their submitted collateral in the vault or their AURA score, which is their on-chain credit score. They gain aura against the interest they pay.

<h1 align="center"> AlgoCrefi</h1>

<p align="center">
  <img src="https://api.netlify.com/api/v1/badges/cd4807cd-29a4-4668-90e0-4d96a68f07ff/deploy-status" alt="netlify status"/>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Network-Testnet-00FFD1?style=for-the-badge" alt="Testnet" />
  <img src="https://img.shields.io/badge/Smart%20Contract-ARC56-7B2FFF?style=for-the-badge" alt="ARC56" />
  <img src="https://img.shields.io/badge/Platform-Algorand-05050A?style=for-the-badge&color=00FFD1" alt="Algorand" />
</p>

## Getting Started

| Section            | Link                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| **Live Demo**      | [algocrefi.netlify.app](https://algocrefi.netlify.app?utm_source=chatgpt.com)                         |
| **Smart Contract** | [View on Lora Explorer](https://lora.algokit.io/testnet/application/758675636) |



### To build locally,
```bash
git clone https://github.com/donendosted/AlgoCrefi-hackseries
cd AlgoCrefi-hackseries/algocrefi-backend

npm install

cd ../algocrefi-frontend
npm install

cd ../algocrefi-contract/projects/algocrefi-contract
algokit generate env-file -a target_network testnet
algokit project run build
algokit project deploy testnet

```

Create `.env` files manually in backend and frontend using these templates.

### Backend `.env` template (`algocrefi-backend/.env`)
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/algocrefi
JWT_SECRET=change_this_secret
JWT_EXPIRES=7d
MNEMONIC=replace_with_your_25_word_algorand_mnemonic
ALGOD_TOKEN=
ALGOD_SERVER=https://testnet-api.algonode.cloud
ALGOD_PORT=
INDEXER_TOKEN=
INDEXER_SERVER=https://testnet-idx.algonode.cloud
INDEXER_PORT=
POOL_APP_ID=YOUR_DEPLOYED_APP_ID
LENDING_APP_ID=YOUR_DEPLOYED_APP_ID
APP_ID=YOUR_DEPLOYED_APP_ID
AURA_APP_ID=YOUR_DEPLOYED_AURA_APP_ID
USDC_ASA_ID=10458941
USDC_DECIMALS=6
MIN_AURA_FOR_UNSECURED=30
BACKEND_WALLET_ADDRESS=
DEFAULT_STATUS_WALLET=
TINYMAN_NETWORK=testnet
TINYMAN_POOL_ADDRESS=
TINYMAN_POOL_ID=
TINYMAN_QUOTE_ASA_ID=10458941
TINYMAN_QUOTE_DECIMALS=6
TINYMAN_ANALYTICS_BASE_URL=
TINYMAN_MAX_SLIPPAGE=0.01
TINYMAN_MIN_SWAP_USDC_UNITS=1000000
TINYMAN_SWAP_WEBHOOK_URL=
TINYMAN_SWAP_WEBHOOK_TOKEN=
DEFAULT_AUTO_SWAP_ENABLED=false
DEFAULT_JOB_ENABLED=true
DEFAULT_JOB_CRON=0 0 * * *
DEFAULT_JOB_TIMEZONE=UTC
POOL_HISTORY_JOB_ENABLED=true
POOL_HISTORY_JOB_CRON=*/30 * * * * *
POOL_TVL_HISTORY_JOB_ENABLED=true
POOL_TVL_HISTORY_JOB_CRON=*/30 * * * * *
POOL_HISTORY_MIN_INTERVAL_SECONDS=30
POOL_HISTORY_MAX_POINTS=25000
POOL_TVL_MIN_INTERVAL_SECONDS=30
POOL_TVL_MAX_POINTS=25000
ACTIVE_LOAN_COUNT_CACHE_TTL_MS=30000
ACTIVE_LOAN_COUNT_SCAN_LIMIT=5000
ACTIVE_LOAN_COUNT_CONCURRENCY=12
```

### Frontend `.env` template (`algocrefi-frontend/.env`)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_POOL_APP_ID=YOUR_DEPLOYED_APP_ID
NEXT_PUBLIC_APP_ID=YOUR_DEPLOYED_APP_ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=demo-walletconnect-project-id
```


## Walkhrough Video

[![AlgoCreFi Demo](https://img.youtube.com/vi/muDi6-bxl84/0.jpg)](https://youtu.be/muDi6-bxl84)

*Watch the complete project walkthrough on [YouTube](https://youtu.be/muDi6-bxl84)*

##  Features

### Core Protocol

- **Liquidity Pool** - Deposit ALGO to earn yield through automated market-making
- **Collateralized Loans** - Borrow ALGO using USDC as collateral at 150% LTV
- **AURA Credit System** - Build on-chain credit reputation through loan repayment
- **Unsecured Loans** - Access collateral-free loans once AURA score reaches 30 points
- **Automated Liquidation** - Smart contract handles default liquidation with Tinyman DEX integration

### Technical Features

- **X-Chain** - AlgroCrefi supports EVM based wallets like (MetaMask, Trust, Rainbow, Core etc.)
- **Tinyman sdk** - Smart contract handles default liquidation with Tinyman DEX integration 
- **ARC56 Compliance** - All smart contracts follow Algorand's latest ABI standard
- **ARC4 Encoding** - Standardized method calling for interoperability
- **Group Transactions** - Atomic operations for complex lending workflows
- **Real-time Market Data** - Live OHLC candles, price feeds, and pool analytics
- **Multi-Wallet Support** - Multiple Algorand wallet integration (Like Lute, Pera, Defly)


## Architechture

<img width="915" height="673" alt="Architectural design" src="https://github.com/user-attachments/assets/9e714a68-fa31-40e8-beca-5f1c564ab5a9" />


## AURA

In DeFi, your wallet is your identity.
**AURA** acts as the credit score for that identity (wallet).

### How to Earn AURA

In simple terms:

* Repaying **1 ALGO** as interest increases your AURA by **+1**

But the calculation is not fully linear.

| Interest Paid  | AURA Increase |
| -------------- | ------------- |
| 1.0 - 1.9 ALGO | +1 AURA       |
| 2.0 - 2.9 ALGO | +2 AURA       |
| 3.0 - 3.9 ALGO | +3 AURA       |

...and so on.

### Non-Collateral Loans

To become eligible for **non-collateral based loans**, a wallet must collect a minimum of **30 AURA**.

Your maximum non-collateral loan limit depends on your AURA score:

```text
Loan Limit = 10% of AURA
```

Example:

* 50 AURA → Eligible for a 5 ALGO loan without collateral

### Default Penalty

Failure to repay may result in:

* Complete AURA reset
* Permanent wallet ban from the protocol 

## Why Algorand?

Algorand offers:

* Fast transaction finality
* Ultra-low transaction fees
* High scalability
* Secure smart contracts

These features make micro-lending efficient, affordable, and accessible for both lenders and borrowers.

---

## Target Users

The platform is designed for:

* Stablecoin holders
* Developers
* Crypto investors seeking liquidity without selling their assets

### Key User Groups

- **Developers & Builders** - Access on-chain micro and macro loans using **AURA points** instead of relying entirely on heavy collateral requirements.

- **Crypto Investors** - Borrow funds without selling long-term crypto holdings.

- **USDC Holders** - Get instant liquidity with no KYC requirements.

- **ALGO Depositors** - Earn passive yield through lending pools.


## License

MIT License - See LICENSE file for details.

---

<p align="center">
  Built with ❤️ by <strong>Team Bengal Tigers</strong> for Hack Series 3.0
</p>
