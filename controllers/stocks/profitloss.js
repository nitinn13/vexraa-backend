const stockService = require('../../services/stockService');
const getAnnualProfitLoss = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: "Stock symbol is required" });
    }

    // Assuming stockService is required at the top of this file
    const data = await stockService.getAnnualProfitLoss(symbol);
    res.status(200).json({ success: true, symbol, data });
  } catch (error) {
    console.error(`Error fetching annual P&L for ${req.params.symbol}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = { getAnnualProfitLoss };