const { fmpFetch } = require('./fmpService');
const {
  calculateCfoPatRatio,
  formatPriceHistory,
  formatRatioData,
  formatGrowthData,
  formatKeyRatios
} = require('../utils/ratioUtils');

/**
 * Fetch historical price data
 * @param {string} symbol - Stock symbol
 * @param {string} period - Time period (1D, 5D, 1M, 1Y, 5Y)
 * @returns {Object} Formatted price data
 */
async function getPriceHistory(symbol, period) {
  try {
    let endpoint, params = '';

    switch (period) {
      case '1D':
        endpoint = `historical-chart/1min/${symbol}`;
        params = 'limit=390'; // 6.5 hours of 1min data
        break;
      case '5D':
        endpoint = `historical-chart/5min/${symbol}`;
        params = 'limit=390'; // 5 days of 5min data
        break;
      case '1M':
        endpoint = `historical-price-full/${symbol}`;
        params = 'serietype=line&from=2023-01-01';
        break;
      case '1Y':
        endpoint = `historical-price-full/${symbol}`;
        params = 'serietype=line&from=2023-01-01';
        break;
      case '5Y':
        endpoint = `historical-price-full/${symbol}`;
        params = 'serietype=line';
        break;
      default:
        endpoint = `historical-price-full/${symbol}`;
        params = 'serietype=line&from=2023-01-01';
    }

    const data = await fmpFetch(endpoint, params);

    if (!data || (Array.isArray(data) && data.length === 0)) {
      throw new Error(`No price data found for ${symbol}`);
    }

    // Handle different response formats
    const priceData = Array.isArray(data) ? data : (data.historical || []);

    return {
      symbol,
      period,
      data: formatPriceHistory(priceData, period)
    };
  } catch (error) {
    console.error(`❌ Error fetching price history for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch price history: ${error.message}`);
  }
}

/**
 * Fetch PE and PB trends
 * @param {string} symbol - Stock symbol
 * @returns {Object} PE and PB trends data
 */
async function getPEPBTrends(symbol) {
  try {
    const data = await fmpFetch(`ratios/${symbol}`, 'limit=5');

    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error(`No ratio data found for ${symbol}`);
    }

    return {
      symbol,
      trends: formatRatioData(data)
    };
  } catch (error) {
    console.error(`❌ Error fetching PE/PB trends for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch PE/PB trends: ${error.message}`);
  }
}

/**
 * Fetch revenue segmentation
 * @param {string} symbol - Stock symbol
 * @returns {Object} Revenue segmentation data
 */
async function getRevenueSegmentation(symbol) {
  try {
    const data = await fmpFetch(`revenue-geographic-segmentation`, `symbol=${symbol}`);

    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error(`No revenue segmentation data found for ${symbol}`);
    }

    return {
      symbol,
      segmentation: data
    };
  } catch (error) {
    console.error(`❌ Error fetching revenue segmentation for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch revenue segmentation: ${error.message}`);
  }
}

/**
 * Fetch financial growth data
 * @param {string} symbol - Stock symbol
 * @returns {Object} Financial growth data
 */
async function getFinancialGrowth(symbol) {
  try {
    const data = await fmpFetch(`financial-growth/${symbol}`, 'limit=5');

    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error(`No financial growth data found for ${symbol}`);
    }

    return {
      symbol,
      growth: formatGrowthData(data)
    };
  } catch (error) {
    console.error(`❌ Error fetching financial growth for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch financial growth: ${error.message}`);
  }
}

/**
 * Fetch key ratios
 * @param {string} symbol - Stock symbol
 * @returns {Object} Key ratios data
 */
async function getKeyRatios(symbol) {
  try {
    const data = await fmpFetch(`ratios/${symbol}`, 'limit=1');

    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error(`No key ratios data found for ${symbol}`);
    }

    return {
      symbol,
      ratios: formatKeyRatios(data)
    };
  } catch (error) {
    console.error(`❌ Error fetching key ratios for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch key ratios: ${error.message}`);
  }
}

/**
 * Fetch CFO/PAT ratio
 * @param {string} symbol - Stock symbol
 * @returns {Object} CFO/PAT ratio data
 */
async function getCfoPatRatio(symbol) {
  try {
    const [cashFlow, incomeStatement] = await Promise.all([
      fmpFetch(`cash-flow-statement/${symbol}`, 'limit=5'),
      fmpFetch(`income-statement/${symbol}`, 'limit=5')
    ]);

    if (!cashFlow || !Array.isArray(cashFlow) || cashFlow.length === 0) {
      throw new Error(`No cash flow data found for ${symbol}`);
    }

    if (!incomeStatement || !Array.isArray(incomeStatement) || incomeStatement.length === 0) {
      throw new Error(`No income statement data found for ${symbol}`);
    }

    const ratios = calculateCfoPatRatio(cashFlow, incomeStatement);

    return {
      symbol,
      cfoPatRatios: ratios
    };
  } catch (error) {
    console.error(`❌ Error fetching CFO/PAT ratio for ${symbol}:`, error.message);
    throw new Error(`Failed to fetch CFO/PAT ratio: ${error.message}`);
  }
}

module.exports = {
  getPriceHistory,
  getPEPBTrends,
  getRevenueSegmentation,
  getFinancialGrowth,
  getKeyRatios,
  getCfoPatRatio
};