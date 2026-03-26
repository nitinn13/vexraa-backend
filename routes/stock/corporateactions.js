const express = require('express');
const router = express.Router();
const corporateactionsController = require('../../controllers/stocks/corporateactions');

// Corporate Actions Route
router.get('/corporate-actions/:symbol', corporateactionsController.getCorporateActions);

module.exports = router;