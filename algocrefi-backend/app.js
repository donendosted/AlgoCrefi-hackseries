const express = require("express");
const cors = require("cors");

const poolRoutes = require("./src/routes/poolRoutes");
const authRoutes = require("./src/routes/authRoutes");
const loanRoutes = require("./src/routes/loanRoutes");
const internalRoutes = require("./src/routes/internalRoutes");
const marketRoutes = require("./src/routes/marketRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get('/test', (req, res) => {
  res.json({ message: 'test ok' });
});

function safeStringify(obj) {
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map((item) => safeStringify(item));
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = safeStringify(value);
    }
    return result;
  }
  return obj;
}

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = function(body) {
    try {
      const serialized = safeStringify(body);
      return originalJson.call(this, serialized);
    } catch (e) {
      console.error('JSON serialization error:', e);
      return originalJson.call(this, { success: false, error: e.message });
    }
  };
  next();
});

app.use("/api/pool", poolRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/loan", loanRoutes);
app.use("/api/internal", internalRoutes);
app.use("/api/market", marketRoutes);

module.exports = app;
