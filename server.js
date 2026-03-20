const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const stockRoutes = require("./routes/stockRoutes");
const adminRoutes = require("./routes/adminRoutes");
const stockController = require("./controllers/stockController");
const { userRouter } = require("./routes/auth/auth");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

app.get("/market-movers", stockController.getMarketMovers);
app.use("/stock", stockRoutes);
app.use("/admin", adminRoutes);
app.use("/auth", userRouter);

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
}

main();