const { fmpFetch } = require("../../services/fmpService");

async function getBalanceSheet(req, res) {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required",
      });
    }

    // 🔥 Fetch from FMP
    const data = await fmpFetch(
      "balance-sheet-statement",
      `symbol=${symbol}&limit=5&period=annual`
    );

    if (!data || !data.length) {
      return res.json({
        success: true,
        symbol,
        data: [],
      });
    }

    // 🔥 Transform (frontend-friendly)
    const formatted = data.map((d) => ({
      date: d.date,
      year: d.fiscalYear,

      assets: {
        currentAssets: d.totalCurrentAssets,
        nonCurrentAssets: d.totalNonCurrentAssets,
        totalAssets: d.totalAssets,
      },

      liabilities: {
        currentLiabilities: d.totalCurrentLiabilities,
        nonCurrentLiabilities: d.totalNonCurrentLiabilities,
        totalLiabilities: d.totalLiabilities,
      },

      equity: {
        equity: d.totalStockholdersEquity,
      },

      debt: {
        totalDebt: d.totalDebt,
        netDebt: d.netDebt,
      },

      cash: {
        cashAndEquivalents: d.cashAndCashEquivalents,
      }
    }));

    res.json({
      success: true,
      symbol,
      data: formatted,
    });

  } catch (error) {
    console.error("Balance Sheet Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch balance sheet data",
    });
  }
}

module.exports = {
  getBalanceSheet,
};