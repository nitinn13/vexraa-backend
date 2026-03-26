const express = require('express');
const router = express.Router();
const superinvestorController = require('../../controllers/stocks/superinvestor');

// News Route
router.get('/:symbol', superinvestorController.getSuperInvestors);

module.exports = router;