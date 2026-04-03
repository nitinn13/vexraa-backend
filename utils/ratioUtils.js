// Ratio calculation utilities

/**
 * Calculate CFO/PAT ratio
 * @param {Array} cashFlow - Cash flow statement data
 * @param {Array} incomeStatement - Income statement data
 * @returns {Array} Array of CFO/PAT ratios with dates
 */
function calculateCfoPatRatio(cashFlow, incomeStatement) {
  if (!cashFlow || !incomeStatement || cashFlow.length === 0 || incomeStatement.length === 0) {
    return [];
  }

  const ratios = [];

  // Create maps for quick lookup by date
  const cashFlowMap = new Map();
  const incomeMap = new Map();

  cashFlow.forEach(cf => {
    if (cf.date && cf.netCashProvidedByOperatingActivities !== undefined) {
      cashFlowMap.set(cf.date, cf.netCashProvidedByOperatingActivities);
    }
  });

  incomeStatement.forEach(is => {
    if (is.date && is.netIncome !== undefined) {
      incomeMap.set(is.date, is.netIncome);
    }
  });

  // Calculate ratios for matching dates
  for (const [date, cfo] of cashFlowMap) {
    const pat = incomeMap.get(date);
    if (pat !== undefined && pat !== 0) {
      ratios.push({
        date,
        ratio: cfo / pat,
        cfo,
        pat
      });
    }
  }

  // Sort by date descending (most recent first)
  return ratios.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/**
 * Format price history data for charts
 * @param {Array} data - Raw price data
 * @param {string} interval - Time interval
 * @returns {Array} Formatted data
 */
function formatPriceHistory(data, interval) {
  if (!data || !Array.isArray(data)) return [];

  return data.map(item => ({
    date: item.date,
    open: item.open,
    high: item.high,
    low: item.low,
    close: item.close,
    volume: item.volume,
    interval
  }));
}

/**
 * Format ratio data for charts
 * @param {Array} data - Raw ratio data
 * @returns {Array} Formatted data
 */
function formatRatioData(data) {
  if (!data || !Array.isArray(data)) return [];

  return data.map(item => ({
    date: item.date,
    peRatio: item.peRatio,
    pbRatio: item.pbRatio,
    priceToBookRatio: item.priceToBookRatio,
    priceEarningsRatio: item.priceEarningsRatio
  }));
}

/**
 * Format growth data
 * @param {Array} data - Raw growth data
 * @returns {Array} Formatted data
 */
function formatGrowthData(data) {
  if (!data || !Array.isArray(data)) return [];

  return data.map(item => ({
    date: item.date,
    revenueGrowth: item.revenueGrowth,
    netIncomeGrowth: item.netIncomeGrowth,
    totalAssetsGrowth: item.totalAssetsGrowth,
    ebitgrowth: item.ebitgrowth
  }));
}

/**
 * Format key ratios
 * @param {Array} data - Raw ratios data
 * @returns {Object} Formatted ratios
 */
function formatKeyRatios(data) {
  if (!data || !Array.isArray(data) || data.length === 0) return {};

  const latest = data[0]; // Most recent

  return {
    roe: latest.returnOnEquity,
    roce: latest.returnOnCapitalEmployed,
    debtToEquity: latest.debtToEquity,
    priceToCashFlow: latest.priceToCashFlowRatio,
    interestCoverage: latest.interestCoverage,
    date: latest.date
  };
}

module.exports = {
  calculateCfoPatRatio,
  formatPriceHistory,
  formatRatioData,
  formatGrowthData,
  formatKeyRatios
};