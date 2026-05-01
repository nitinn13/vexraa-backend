// controllers/stocks/cashflow.js
const { fmpFetch } = require("../../services/fmpservice");

// 🔥 Convert numbers → Millions
function formatValue(val) {
  if (val === null || val === undefined || isNaN(val)) return "0.00";

  // Divide by 1 million and fix to 2 decimal places
  return (val / 1e6).toFixed(2);
}

// 🔥 Growth %
function calcGrowth(values) {
  return values.map((val, i) => {
    if (i === 0 || !values[i - 1]) return null;

    const prev = values[i - 1];
    if (prev === 0) return null;

    return (((val - prev) / Math.abs(prev)) * 100).toFixed(2);
  });
}

async function getCashFlow(req, res) {
  try {
    const { symbol } = req.params;
    const { limit = 5 } = req.query;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol required",
      });
    }

    const data = await fmpFetch(
      "cash-flow-statement",
      `symbol=${symbol}&period=annual&limit=${limit}`
    );

    if (!data || data.length === 0) {
      return res.json({
        success: true,
        symbol,
        data: null,
      });
    }

    const sorted = [...data].reverse();
    const columns = sorted.map((d) => `MAR ${d.fiscalYear}`);

    // 🔥 Raw values first (needed for growth calc)
    const buildRow = (label, extractor) => {
      const raw = sorted.map((d) => extractor(d) || 0);

      return {
        label,
        values: raw.map(formatValue), // Now consistently in Millions
        growth: calcGrowth(raw),
      };
    };

    const rows = [
      buildRow("Profit from operations", (d) => d.netIncome),
      buildRow("Adjustment", (d) =>
        (d.depreciationAndAmortization || 0) +
        (d.stockBasedCompensation || 0) +
        (d.otherNonCashItems || 0)
      ),
      buildRow("Changes in Assets & Liabilities", (d) => d.changeInWorkingCapital),
      buildRow("Tax Paid", (d) => -Math.abs(d.incomeTaxesPaid || 0)),
      buildRow("Operating Cash Flow", (d) => d.operatingCashFlow),
      buildRow("Investing Cash Flow", (d) => d.netCashProvidedByInvestingActivities),
      buildRow("Financing Cash Flow", (d) => d.netCashProvidedByFinancingActivities),
      buildRow("Net Cash Flow", (d) => d.netChangeInCash),
    ];

    return res.json({
      success: true,
      symbol,
      data: {
        columns,
        rows,
        subtitle: "(Values in Millions)", // Updated subtitle
      },
    });

  } catch (err) {
    console.error("Cash Flow Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cash flow",
    });
  }
}

module.exports = { getCashFlow };