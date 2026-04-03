const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const stockRoutes = require("./routes/stock"); 
const { userRouter } = require("./routes/auth/auth");
const { initializeStockSearch } = require("./controllers/stocks/searchController");


const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());
app.use("/api/stocks", stockRoutes);   
app.use("/auth", userRouter);


async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await initializeStockSearch();
    setInterval(initializeStockSearch, 24 * 60 * 60 * 1000);

    app.listen(PORT, () => {
      console.log(`Backend running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
  }
}

main();