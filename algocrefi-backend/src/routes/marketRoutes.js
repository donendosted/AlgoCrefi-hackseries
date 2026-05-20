const express = require("express");
const router = express.Router();
const marketController = require("../controllers/marketController");

router.get("/", (_req, res) => {
  res.json({
    service: "market",
    endpoints: [
      "GET /api/market/stats",
      "GET /api/market/ohlc",
      "GET /api/market/pool-snapshot",
      "GET /api/market/pool-history",
    ],
  });
});

router.get("/ohlc", marketController.getOhlc);
router.get("/stats", marketController.getStats);
router.get("/pool-snapshot", marketController.getPoolSnapshot);
router.get("/pool-history", marketController.getPoolHistory);
router.get("/pool-snapshot/stream", marketController.streamPoolSnapshot);

module.exports = router;
