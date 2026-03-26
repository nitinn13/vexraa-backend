const express = require('express');
const router = express.Router();
const newsController = require('../../controllers/stocks/news');

// News Route
router.get('/:symbol', newsController.getLatestNews);

module.exports = router;