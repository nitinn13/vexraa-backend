const express = require('express');
const router = express.Router();
const insightsController = require('../../controllers/stocks/insights');

// News Route
router.get('/:symbol', insightsController.getInsights);

module.exports = router;