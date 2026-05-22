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

<h3>Visit the Live Link -
<a href="https://algocrefi.netlify.app">algocrefi.netlify.app</a>
</h3>

### To build locally,
```bash
git clone https://github.com/donendosted/AlgoCrefi-hackseries
cd AlgoCrefi-hackseries/algocrefi-backend

npm install

cd ../algocrefi-frontend
npm install

cd ../algocrefi-contract/projects/algocrefi-contract
algokit project run build
algokit project deploy testnet

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


## 📄 License

MIT License - See LICENSE file for details.

---

<p align="center">
  Built with ❤️ by <strong>Team Bengal Tigers</strong> for Hack Series 3.0
</p>
