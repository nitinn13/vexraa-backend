const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const stockRoutes = require("./routes/stockRoutes");
const adminRoutes = require("./routes/adminRoutes");
const stockController = require("./controllers/stockController");
const { userRouter } = require("./routes/auth/auth");
const quarterlyResultRoutes = require('./routes/stock/quaterlyresult');
const profitlossRoutes = require('./routes/stock/profitloss');
const balanceSheetRoutes = require('./routes/stock/balancesheet');
const shareholdingRoutes = require('./routes/stock/shareholding');
const corporateactionsRoutes = require('./routes/stock/corporateactions');
const peercomparisonRoutes = require('./routes/stock/peercomparison');
const newsRoutes = require('./routes/stock/news');
const insightsRoutes = require('./routes/stock/insights');
const superinvestorRoutes = require('./routes/stock/superinvestor');
const reportsAndFilingsRoutes = require('./routes/stock/reportsandfilings');


const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

// Routes
// Note: /market-movers is placed globally as requested by frontend config rather than /stock/market-movers
app.get('/market-movers', stockController.getMarketMovers);
app.use('/stock', stockRoutes);
app.use('/admin', adminRoutes);
app.use("/auth", userRouter);
app.use('/quaterlyresult', quarterlyResultRoutes);
app.use('/profitloss', profitlossRoutes);
app.use('/balancesheet', balanceSheetRoutes);
app.use('/shareholding', shareholdingRoutes);
app.use('/corporateactions', corporateactionsRoutes);
app.use('/peercomparison', peercomparisonRoutes);
app.use('/news', newsRoutes);
app.use('/insights', insightsRoutes);
app.use('/superinvestor', superinvestorRoutes);
app.use('/reportsandfilings', reportsAndFilingsRoutes);




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