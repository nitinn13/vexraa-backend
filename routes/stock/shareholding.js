// routes/stock/shareholding.js
const express = require('express');
const router = express.Router();
const shareholdingController = require('../../controllers/stocks/shareholding');

// Endpoint will resolve to: GET /shareholding/:symbol
router.get('/:symbol', shareholdingController.getShareholdingPattern);

module.exports = router;