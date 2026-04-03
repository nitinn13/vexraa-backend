const {
  getPriceHistory,
  getPEPBTrends,
  getRevenueSegmentation,
  getFinancialGrowth,
  getKeyRatios,
  getCfoPatRatio
} = require('../../services/ratioChartService');

/**
 * Get price history data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getPriceHistoryController(req, res) {
  try {
    const { symbol } = req.params;
    const { period = '1Y' } = req.query;

    if (!symbol) {
      return res.status(400).json({
        error: 'Symbol parameter is required'
      });
    }

    const validPeriods = ['1D', '5D', '1M', '1Y', '5Y'];
    if (!validPeriods.includes(period)) {
      return res.status(400).json({
        error: 'Invalid period. Must be one of: 1D, 5D, 1M, 1Y, 5Y'
      });
    }

    const data = await getPriceHistory(symbol.toUpperCase(), period);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Error in getPriceHistoryController:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get PE/PB trends data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getPEPBTrendsController(req, res) {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        error: 'Symbol parameter is required'
      });
    }

    const data = await getPEPBTrends(symbol.toUpperCase());

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Error in getPEPBTrendsController:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get revenue segmentation data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getRevenueSegmentationController(req, res) {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        error: 'Symbol parameter is required'
      });
    }

    const data = await getRevenueSegmentation(symbol.toUpperCase());

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Error in getRevenueSegmentationController:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get financial growth data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getFinancialGrowthController(req, res) {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        error: 'Symbol parameter is required'
      });
    }

    const data = await getFinancialGrowth(symbol.toUpperCase());

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Error in getFinancialGrowthController:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get key ratios data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function getKeyRatiosController(req, res) {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        error: 'Symbol parameter is required'
      });
    }

    const data = await getKeyRatios(symbol.toUpperCase());

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('❌ Error in getKeyRatiosController:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  getPriceHistory: getPriceHistoryController,
  getPEPBTrends: getPEPBTrendsController,
  getRevenueSegmentation: getRevenueSegmentationController,
  getFinancialGrowth: getFinancialGrowthController,
  getKeyRatios: getKeyRatiosController
};