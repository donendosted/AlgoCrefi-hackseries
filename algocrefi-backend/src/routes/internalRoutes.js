const express = require("express");
const router = express.Router();
const { swapDefaultedCollateral } = require("../controllers/internalController");

router.post("/tinyman/swap-defaulted", swapDefaultedCollateral);

module.exports = router;
