const { fmpFetch } = require("../../services/fmpService");

function formatPercent(num) {
  if (num === null || num === undefined || isNaN(num)) return "0.00%";
  return (num * 100).toFixed(2) + "%";
}

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return "0.00";
  return Number(num).toFixed(2);
}

async function getKeyMetrics(req, res) {
  try {
    const { symbol } = req.params;
    const data = await fmpFetch("key-metrics", `symbol=${symbol}&limit=1`);

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "No metrics found" });
    }

    const m = data[0];

    const response = {
      valuation: [
        { label: "P/E Ratio", value: formatNumber(m.peRatio || 0) },
        { label: "P/B Ratio", value: formatNumber(m.pbRatio || 0) },
        { label: "P/S Ratio", value: formatNumber(m.priceToSalesRatio || 0) },
        { label: "P/FCF", value: formatNumber(m.priceToFreeCashFlowRatio || 0) },
      ],

      profitability: [
        { label: "Net Margin", value: formatPercent(m.netProfitMargin || 0) },
        { label: "Operating Margin", value: formatPercent(m.operatingProfitMargin || 0) },
        { label: "EBITDA Margin", value: formatPercent(m.ebitdaMargin || 0) },
        { label: "ROE", value: formatPercent(m.returnOnEquity || 0) },
      ],

      liquidity: [
        { label: "Current Ratio", value: formatNumber(m.currentRatio || 0) },
        { label: "Quick Ratio", value: formatNumber(m.quickRatio || 0) },
        { label: "Cash Ratio", value: formatNumber(m.cashRatio || 0) },
      ],

      leverage: [
        { label: "Debt to Equity", value: formatNumber(m.debtToEquity || 0) },
        { label: "Debt to Assets", value: formatNumber(m.debtToAssets || 0) },
        { label: "Interest Coverage", value: formatNumber(m.interestCoverage || 0) },
      ],

      efficiency: [
        { label: "Asset Turnover", value: formatNumber(m.assetTurnover || 0) },
        { label: "Inventory Turnover", value: formatNumber(m.inventoryTurnover || 0) },
        { label: "Receivables Turnover", value: formatNumber(m.receivablesTurnover || 0) },
      ],

      perShare: [
        { label: "Revenue / Share", value: formatNumber(m.revenuePerShare || 0) },
        { label: "EPS", value: formatNumber(m.netIncomePerShare || 0) },
        { label: "FCF / Share", value: formatNumber(m.freeCashFlowPerShare || 0) },
        { label: "Book Value / Share", value: formatNumber(m.bookValuePerShare || 0) },
      ],

      dividends: [
        { label: "Dividend Yield", value: formatPercent(m.dividendYield || 0) },
        { label: "Payout Ratio", value: formatPercent(m.payoutRatio || 0) },
      ],
    };

    res.json(response);
  } catch (error) {
    console.error("Metrics error:", error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getKeyMetrics,
};
