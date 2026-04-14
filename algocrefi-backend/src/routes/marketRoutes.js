const express = require("express");
const router = express.Router();
const marketController = require("../controllers/marketController");

router.get("/", (_req, res) => {
  res.json({
    service: "market",
    endpoints: ["GET /api/market/stats", "GET /api/market/ohlc"],
  });
});

router.get("/ohlc", marketController.getOhlc);
router.get("/stats", marketController.getStats);
router.get("/pool-snapshot", marketController.getPoolSnapshot);

module.exports = router;
