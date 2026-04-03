const { fmpFetch } = require("../../services/fmpService");

function formatPercent(num) {
  return (num * 100).toFixed(2) + "%";
}

function formatNumber(num) {
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
        { label: "P/E Ratio", value: formatNumber(m.priceToEarningsRatio) },
        { label: "P/B Ratio", value: formatNumber(m.priceToBookRatio) },
        { label: "P/S Ratio", value: formatNumber(m.priceToSalesRatio) },
        { label: "P/FCF", value: formatNumber(m.priceToFreeCashFlowRatio) },
      ],

      profitability: [
        { label: "Net Margin", value: formatPercent(m.netProfitMargin) },
        { label: "Operating Margin", value: formatPercent(m.operatingProfitMargin) },
        { label: "EBITDA Margin", value: formatPercent(m.ebitdaMargin) },
        { label: "ROE (approx)", value: formatPercent(m.returnOnEquity || 0) },
      ],

      liquidity: [
        { label: "Current Ratio", value: formatNumber(m.currentRatio) },
        { label: "Quick Ratio", value: formatNumber(m.quickRatio) },
        { label: "Cash Ratio", value: formatNumber(m.cashRatio) },
      ],

      leverage: [
        { label: "Debt to Equity", value: formatNumber(m.debtToEquityRatio) },
        { label: "Debt to Assets", value: formatNumber(m.debtToAssetsRatio) },
        { label: "Financial Leverage", value: formatNumber(m.financialLeverageRatio) },
      ],

      efficiency: [
        { label: "Asset Turnover", value: formatNumber(m.assetTurnover) },
        { label: "Inventory Turnover", value: formatNumber(m.inventoryTurnover) },
        { label: "Receivables Turnover", value: formatNumber(m.receivablesTurnover) },
      ],

      perShare: [
        { label: "Revenue / Share", value: formatNumber(m.revenuePerShare) },
        { label: "EPS", value: formatNumber(m.netIncomePerShare) },
        { label: "FCF / Share", value: formatNumber(m.freeCashFlowPerShare) },
        { label: "Book Value / Share", value: formatNumber(m.bookValuePerShare) },
      ],

      dividends: [
        { label: "Dividend Yield", value: formatPercent(m.dividendYield) },
        { label: "Payout Ratio", value: formatPercent(m.dividendPayoutRatio) },
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