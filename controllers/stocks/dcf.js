const { fmpFetch } = require("../../services/fmpservice");

async function getDCFValuation(req, res) {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required",
      });
    }

    const data = await fmpFetch(
      "discounted-cash-flow",
      `symbol=${symbol}`
    );

    if (!data || data.length === 0) {
      return res.json({
        success: true,
        symbol,
        data: null,
      });
    }

    const d = data[0];

    // 🔥 Clean response (frontend friendly)
    const formatted = {
      symbol: d.symbol,
      date: d.date,
      dcf: d.dcf,
      currentPrice: d["Stock Price"],
      upside:
        d["Stock Price"] && d.dcf
          ? (((d.dcf - d["Stock Price"]) / d["Stock Price"]) * 100).toFixed(2)
          : null,
    };

    return res.json({
      success: true,
      symbol,
      data: formatted,
    });

  } catch (error) {
    console.error("DCF Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch DCF valuation",
    });
  }
}

module.exports = { getDCFValuation };