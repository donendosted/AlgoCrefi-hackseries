require("dotenv").config();

const app = require("./app");
const connectDB = require("./src/configs/db");
const { startScheduler } = require("./src/jobs/scheduler");

// connect database
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startScheduler();
});
