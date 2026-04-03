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
const { getPriceChart } = require('../../controllers/stocks/priceChart');
const { getVolumeChart } = require('../../controllers/stocks/volumeChart');
const { getPEChart } = require('../../controllers/stocks/peChart');
const { getPBChart } = require('../../controllers/stocks/pbChart');
const { getDonutChart } = require('../../controllers/stocks/donutChart');
const { getRatios } = require('../../controllers/stocks/ratios');

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

router.get('/:symbol/price-chart', getPriceChart);

router.get('/:symbol/volume-chart', getVolumeChart);

router.get('/:symbol/pe-chart', getPEChart);

router.get('/:symbol/pb-chart', getPBChart);

router.get('/:symbol/donut-chart', getDonutChart);

router.get('/:symbol/ratios', getRatios);

module.exports = router;