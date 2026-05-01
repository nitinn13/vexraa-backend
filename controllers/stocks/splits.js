// controllers/stocks/splits.js
const { fmpFetch } = require("../../services/fmpservice");

async function getStockSplits(req, res) {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required",
      });
    }

    const data = await fmpFetch(
      "splits",
      `symbol=${symbol}`
    );

    if (!data || data.length === 0) {
      return res.json({
        success: true,
        symbol,
        data: [],
      });
    }

    // 🔥 Format clean response
    const formatted = data.map((d) => ({
      date: d.date,
      ratio: `${d.numerator}:${d.denominator}`,
      numerator: d.numerator,
      denominator: d.denominator,
      type: d.splitType,
    }));

    return res.json({
      success: true,
      symbol,
      count: formatted.length,
      data: formatted,
    });

  } catch (err) {
    console.error("Stock Splits Error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch stock splits",
    });
  }
}

module.exports = { getStockSplits };