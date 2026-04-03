const express = require('express');
const router = express.Router();

const {
  getPriceHistory,
  getPEPBTrends,
  getRevenueSegmentation,
  getFinancialGrowth,
  getKeyRatios
} = require('../../controllers/stocks/ratioChartController');

// Price history endpoints
router.get('/price/:symbol', getPriceHistory);

// Valuation trends (PE/PB)
router.get('/valuation/:symbol', getPEPBTrends);

// Revenue segmentation
router.get('/revenue/:symbol', getRevenueSegmentation);

// Financial growth
router.get('/growth/:symbol', getFinancialGrowth);

// Key ratios
router.get('/ratios/:symbol', getKeyRatios);

module.exports = router;