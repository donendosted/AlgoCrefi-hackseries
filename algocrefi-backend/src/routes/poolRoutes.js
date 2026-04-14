const express = require("express");
const router = express.Router();
const poolController = require("../controllers/poolController");
const { verifyToken } = require("../middlewares/authMiddleware");

router.post("/deposit", verifyToken, poolController.deposit);
router.post("/opt-in", verifyToken, poolController.optIn);
router.post("/withdraw", verifyToken, poolController.withdraw);
router.get("/pool-info", poolController.getPoolInfo);
router.get("/user-info", verifyToken, poolController.getUserInfo);

module.exports = router;
