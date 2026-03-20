const stockService = require('../services/stockService');
const cacheManager = require('../utils/cache');

const getStock = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    cacheManager.incrementRequests();
    const stock = await stockService.getStockProfile(symbol);
    res.json(stock);
  } catch (err) {
    if (err.message === "Stock not found") {
      res.status(404).json({ error: "Stock not found" });
    } else {
      console.error("Backend Error:", err);
      res.status(500).json({ error: err.message || "Server error" });
    }
  }
};

const getMarketMovers = async (req, res) => {
  try {
    cacheManager.incrementRequests();
    const movers = await stockService.getMarketMovers(req.query.symbols);
    res.json({ movers });
  } catch (err) {
    console.error("Backend Error (market-movers):", err);
    res.status(500).json({ error: err.message || "Server error" });
  }
};

const getHistory = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const history = await stockService.getStockHistory(symbol);
    res.json(history);
  } catch (err) {
    console.error("Backend Error (history):", err);
    res.status(500).json({ error: "Server error generating history" });
  }
};

const getBrands = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const brands = await stockService.getStockBrands(symbol);
    res.json({ symbol, brands });
  } catch (err) {
    console.error("Backend Error (brands):", err);
    res.status(500).json({ error: "Server error generating brands" });
  }
};

const getIndices = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const indices = await stockService.getStockIndices(symbol);
    res.json({ symbol, ...indices });
  } catch (err) {
    console.error("Backend Error (indices):", err);
    res.status(500).json({ error: "Server error generating indices" });
  }
};

module.exports = {
  getStock,
  getMarketMovers,
  getHistory,
  getBrands,
  getIndices
};
