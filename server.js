const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");

const stockRoutes = require('./routes/stockRoutes');
const adminRoutes = require('./routes/adminRoutes');
const stockController = require('./controllers/stockController');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: "http://localhost:5173"
  })
);

app.use(express.json());

// Routes
// Note: /market-movers is placed globally as requested by frontend config rather than /stock/market-movers
app.get('/market-movers', stockController.getMarketMovers);
app.use('/stock', stockRoutes);
app.use('/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
