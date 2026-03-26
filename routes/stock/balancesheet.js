// routes/stock/balancesheet.js
const express = require('express');
const router = express.Router();
const balanceSheetController = require('../../controllers/stocks/balancesheet');

// Endpoint will resolve to: GET /balancesheet/:symbol
router.get('/:symbol', balanceSheetController.getBalanceSheet);

module.exports = router;