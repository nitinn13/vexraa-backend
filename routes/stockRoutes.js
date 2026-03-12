const express = require('express');
const router = express.Router();
const stockController = require('../controllers/stockController');

router.get('/:symbol', stockController.getStock);
router.get('/:symbol/history', stockController.getHistory);
router.get('/:symbol/brands', stockController.getBrands);
router.get('/:symbol/indices', stockController.getIndices);

module.exports = router;
