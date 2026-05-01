// controllers/stocks/superinvestors.js
const { fmpFetch } = require("../../services/fmpservice");

async function getSuperInvestors(req, res) {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol required",
      });
    }

    // ⚠️ You must pass year + quarter
    const year = 2023;
    const quarter = 3;

    const data = await fmpFetch(
      "institutional-ownership/extract-analytics/holder",
      `symbol=${symbol}&year=${year}&quarter=${quarter}&page=0&limit=20`
    );

    if (!data || data.length === 0) {
      return res.json({
        success: true,
        symbol,
        data: [],
      });
    }

    // 🔥 Clean + sort top holders
    const investors = data
      .filter((d) => d.investorName && d.sharesNumber)
      .sort((a, b) => b.sharesNumber - a.sharesNumber)
      .slice(0, 10)
      .map((d) => ({
        name: d.investorName,
        cik: d.cik,
        shares: d.sharesNumber,
        ownership: d.ownership, // %
        value: d.marketValue,
      }));

    return res.json({
      success: true,
      symbol,
      count: investors.length,
      data: investors,
    });

  } catch (err) {
    console.error("Super Investors Error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch super investors",
    });
  }
}

module.exports = { getSuperInvestors };