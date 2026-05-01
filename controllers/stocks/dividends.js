// controllers/stocks/dividends.js
const { fmpFetch } = require("../../services/fmpservice");

function pct(v) {
  if (v === null || v === undefined || isNaN(v)) return null;
  return Number((v * 100).toFixed(2)); // convert to %
}

async function getDividends(req, res) {
  try {
    const { symbol } = req.params;
    const { limit = 20 } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required",
      });
    }

    const data = await fmpFetch(
      "dividends",
      `symbol=${symbol}`
    );

    if (!data || data.length === 0) {
      return res.json({
        success: true,
        symbol,
        data: [],
      });
    }

    // 🔥 sort latest first + limit
    const sorted = [...data]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, Number(limit));

    // 🔥 format for UI
    const formatted = sorted.map((d) => ({
      date: d.date,                     // ex-dividend date (usually same as record here)
      recordDate: d.recordDate,
      paymentDate: d.paymentDate,
      declarationDate: d.declarationDate,

      amount: d.dividend ?? d.adjDividend ?? 0, // per share
      yieldPct: pct(d.yield),                   // in %

      frequency: d.frequency || "—",
    }));

    // 🔥 simple stats (useful for cards)
    const latest = formatted[0];
    const ttm = formatted
      .slice(0, 4)
      .reduce((acc, d) => acc + (d.amount || 0), 0);

    return res.json({
      success: true,
      symbol,
      count: formatted.length,
      data: formatted,

      summary: {
        latestDividend: latest?.amount ?? null,
        latestYieldPct: latest?.yieldPct ?? null,
        frequency: latest?.frequency ?? null,
        ttmDividend: Number(ttm.toFixed(4)), // trailing 12 months
      },
    });

  } catch (err) {
    console.error("Dividends Error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch dividends",
    });
  }
}

module.exports = { getDividends };