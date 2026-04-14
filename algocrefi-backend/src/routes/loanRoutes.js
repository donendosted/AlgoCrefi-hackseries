const express = require("express");
const router = express.Router();
const { verifyToken } = require("../middlewares/authMiddleware");
const loanController = require("../controllers/loanController");

router.post("/collateral/quote", verifyToken, loanController.quoteCollateral);
router.post("/lending/opt-in", verifyToken, loanController.optInLending);
router.post("/aura/opt-in", verifyToken, loanController.optInAura);

router.post("/collateral/request", verifyToken, loanController.requestCollateralLoan);
router.post("/liquidity/add", verifyToken, loanController.addLiquidity);
router.post("/unsecured/request", verifyToken, loanController.requestUnsecuredLoan);
router.post("/repay", verifyToken, loanController.repayLoan);

router.post("/admin/app-opt-in-usdc", loanController.appOptInUsdc);
router.post("/admin/liquidate", loanController.liquidateDefault);

router.get("/status", verifyToken, loanController.getLoanStatus);
router.get("/status/:walletAddress", loanController.getLoanStatus);
router.get("/info", loanController.getLoanInfo);

module.exports = router;
