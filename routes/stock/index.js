const express = require('express');
const router = express.Router();

const quarterlyController = require('../../controllers/stocks/quaterlyresult');
const shareholdingController = require('../../controllers/stocks/shareholding');
const balanceSheetController = require('../../controllers/stocks/balancesheet');
const profitlossController = require('../../controllers/stocks/profitloss');
const corporateactionsController = require('../../controllers/stocks/corporateactions');
const reportsController = require('../../controllers/stocks/reportsandfilings');
const superinvestorController = require('../../controllers/stocks/superinvestor');
const peercomparisonController = require('../../controllers/stocks/peercomparison');
const insightsController = require('../../controllers/stocks/insights');
const newsController = require('../../controllers/stocks/news');
const { searchStocks } = require('../../controllers/stocks/searchController');

router.get('/search', searchStocks)

router.get('/:symbol/quarterly', quarterlyController.getQuarterlyResults);

router.get('/:symbol/shareholding', shareholdingController.getShareholdingPattern);

router.get('/:symbol/balancesheet', balanceSheetController.getBalanceSheet);

router.get('/:symbol/profit-loss', profitlossController.getAnnualProfitLoss);

router.get('/:symbol/corporate-actions', corporateactionsController.getCorporateActions);

router.get('/:symbol/reports', reportsController.getReportsAndFilings);

router.get('/:symbol/superinvestors', superinvestorController.getSuperInvestors);

router.get('/:symbol/peers', peercomparisonController.getPeerComparison);

router.get('/:symbol/insights', insightsController.getInsights);

router.get('/:symbol/news', newsController.getLatestNews);

module.exports = router;