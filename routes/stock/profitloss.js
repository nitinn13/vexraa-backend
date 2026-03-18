const express = require('express');
const router = express.Router();
const profitlossController = require('../../controllers/stocks/profitloss');

// Example URL: GET /quaterlyresult/AAPL/profit-loss
router.get('/:symbol/profit-loss', profitlossController.getAnnualProfitLoss);

module.exports = router;