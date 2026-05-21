<img width="1600" height="555" alt="AlgoCrefi" src="https://github.com/user-attachments/assets/b8c68073-0996-4ed5-9585-440739b783bb" />

AlgoCrefi is a decentralised, non-sutodial pool-based over-collateral as well as under-collateral credit platform. Investors diposit cryptocurrency in the pool expecting profit when the value of the pool increses by borrowers paying back with the interest they hold. Borrowers get instant loans based on their submitted collateral in the vault or their AURA score, which is their on-chain credit score. They gain aura against the interest they pay.

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

- **ARC56 Compliance** - All smart contracts follow Algorand's latest ABI standard
- **ARC4 Encoding** - Standardized method calling for interoperability
- **Group Transactions** - Atomic operations for complex lending workflows
- **Real-time Market Data** - Live OHLC candles, price feeds, and pool analytics
- **Multi-Wallet Support** - Pera Wallet, Lute Wallet integration


## Architechture

<img width="915" height="673" alt="Architectural design" src="https://github.com/user-attachments/assets/9e714a68-fa31-40e8-beca-5f1c564ab5a9" />


## AURA
