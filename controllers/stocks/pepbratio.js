// controllers/stocks/valuationChart.js
const { fmpFetch } = require("../../services/fmpservice");

/**
 * Maps frontend timeframes (3M, 1Y, 3Y, 5Y) to FMP API parameters.
 * We prioritize 'quarter' for shorter terms to ensure a meaningful chart line.
 */
function mapTimeframeToParams(range) {
  switch (range.toUpperCase()) {
    case "3M":
      // Show the last 3 quarters to give context to the 3-month movement
      return { period: "quarter", limit: 3 };
    case "1Y":
      // 4 quarters = 1 year
      return { period: "quarter", limit: 4 };
    case "3Y":
      // 12 quarters = 3 years
      return { period: "quarter", limit: 12 };
    case "5Y":
      // 5 annual data points for long-term valuation
      return { period: "annual", limit: 5 };
    default:
      // Default to 3Y Quarterly if something goes wrong
      return { period: "quarter", limit: 12 };
  }
}

async function pePbRatio(req, res) {
  try {
    const { symbol } = req.params;
    // Extract period or range from query. Default range to 3Y if nothing is provided.
    const { range = "3Y", period: manualPeriod } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol required",
      });
    }

    let period, limit;

    // 1. Check if user sent a direct 'period' (annual/quarter)
    if (manualPeriod) {
      period = manualPeriod;
      limit = req.query.limit ? parseInt(req.query.limit) : 12;
    } else {
      // 2. Otherwise, use the timeframe mapping (3M, 1Y, 3Y, 5Y)
      const settings = mapTimeframeToParams(range);
      period = settings.period;
      limit = settings.limit;
    }

    const data = await fmpFetch(
      "ratios",
      `symbol=${symbol}&period=${period}&limit=${limit}`
    );

    if (!data || !Array.isArray(data) || data.length === 0) {
      return res.json({
        success: true,
        symbol,
        data: [],
      });
    }

    const formatted = data
      .map((d) => ({
        date: d.date,
        // FMP returns these as priceToEarningsRatio and priceToBookRatio
        pe: d.priceToEarningsRatio 
          ? Number(d.priceToEarningsRatio.toFixed(2)) 
          : null,
        pb: d.priceToBookRatio 
          ? Number(d.priceToBookRatio.toFixed(2)) 
          : null,
      }))
      // Filter out entries where both values might be null
      .filter((d) => d.pe !== null || d.pb !== null)
      // Reverse so the oldest date is first (Left-to-Right on a chart)
      .reverse();

    return res.json({
      success: true,
      symbol,
      range: manualPeriod ? `manual-${manualPeriod}` : range,
      data: formatted,
    });

  } catch (err) {
    console.error("Valuation Chart Error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch valuation data",
    });
  }
}

module.exports = { pePbRatio };