const express = require('express');
const router = express.Router();
const reportsController = require('../../controllers/stocks/reportsandfilings');

// Reports and Filings Route
router.get('/:symbol', reportsController.getReportsAndFilings);

module.exports = router;