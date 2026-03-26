// routes/stockRoutes.js
const express = require('express');
const router = express.Router();
const stockController = require('../../controllers/stocks/quaterlyresult');


// Define the route for Team C's Quarterly Results
// Example URL: GET /api/stocks/AAPL/quarterly
router.get('/:symbol/quarterly', stockController.getQuarterlyResults);

module.exports = router;


