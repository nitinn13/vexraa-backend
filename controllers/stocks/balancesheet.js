// controllers/stocks/balancesheet.js
const stockService = require('../../services/stockService');

const getBalanceSheet = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: "Stock symbol is required" });
    }

    const data = await stockService.getAnnualBalanceSheet(symbol);
    res.status(200).json({ success: true, symbol, data });
  } catch (error) {
    console.error(`Error fetching balance sheet for ${req.params.symbol}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getBalanceSheet
};