const express = require('express');
const router = express.Router();

const peercomparisonController = require('../../controllers/stocks/peercomparison'); 

router.get('/:symbol', peercomparisonController.getPeerComparison);

module.exports = router;