const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const { generateToken } = require("../utils/jwt");

// signup
exports.signup = async (req, res) => {
  try {
    const { password, walletAddress } = req.body;
    
    if (!walletAddress || !password) {
      return res.status(400).json({ error: "walletAddress and password are required" });
    }

    const existingUser = await User.findOne({ walletAddress });
    if (existingUser) {
      return res.status(400).json({ error: "Wallet already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      password: hashedPassword,
      walletAddress,
    });

    res.json({
      success: true,
      message: "User created",
      userId: user._id,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// login
exports.login = async (req, res) => {
  try {
    const { walletAddress, password } = req.body;

    if (!walletAddress || !password) {
      return res.status(400).json({ error: "walletAddress and password are required" });
    }

    const user = await User.findOne({ walletAddress });

    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Invalid password" });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
