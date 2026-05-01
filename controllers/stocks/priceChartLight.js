// controllers/stocks/priceChartLight.js
const { fmpFetch } = require("../../services/fmpservice");

async function getPriceChartLight(req, res) {
  try {
    const { symbol } = req.params;
    const { from, to } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required",
      });
    }

    // 🔥 Default: last 3 months if not provided
    const today = new Date();
    const defaultFrom = new Date();
    defaultFrom.setMonth(today.getMonth() - 3);

    const fromDate = from || defaultFrom.toISOString().split("T")[0];
    const toDate = to || today.toISOString().split("T")[0];

    const data = await fmpFetch(
      "historical-price-eod/light",
      `symbol=${symbol}&from=${fromDate}&to=${toDate}`
    );

    if (!data || data.length === 0) {
      return res.json({
        success: true,
        symbol,
        data: [],
      });
    }

    // 🔥 Sort ascending (important for charts)
    const sorted = data.sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    // 🔥 Clean structure
    const formatted = sorted.map((d) => ({
      date: d.date,
      price: d.price,
      volume: d.volume,
    }));

    return res.json({
      success: true,
      symbol,
      range: {
        from: fromDate,
        to: toDate,
      },
      count: formatted.length,
      data: formatted,
    });

  } catch (err) {
    console.error("Price Chart Error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch price chart",
    });
  }
}

module.exports = { getPriceChartLight };