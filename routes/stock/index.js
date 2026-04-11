const express = require('express');
const router = express.Router();

const quarterlyController = require('../../controllers/stocks/quaterlyresult');
const shareholdingController = require('../../controllers/stocks/shareholding');
const profitlossController = require('../../controllers/stocks/profitloss');
const corporateactionsController = require('../../controllers/stocks/corporateactions');
const reportsController = require('../../controllers/stocks/reportsandfilings');
const superinvestorController = require('../../controllers/stocks/superinvestor');
const peercomparisonController = require('../../controllers/stocks/peercomparison');
const insightsController = require('../../controllers/stocks/insights');
const newsController = require('../../controllers/stocks/news');
const { getBalanceSheet } = require('../../controllers/stocks/balancesheet');
const { searchStocks } = require('../../controllers/stocks/searchController');

const { getCompanyProfile } = require('../../controllers/stocks/profile');
const { getKeyMetrics } = require('../../controllers/stocks/metrics');

const { getPriceChart } = require('../../controllers/stocks/priceChart');
const { getVolumeChart } = require('../../controllers/stocks/volumeChart');
const { getPEChart } = require('../../controllers/stocks/peChart');
const { getPBChart } = require('../../controllers/stocks/pbChart');
const { getDonutChart } = require('../../controllers/stocks/donutChart');
const { getRatios } = require('../../controllers/stocks/ratios');
const { getPriceSummary } = require('../../controllers/stocks/priceSummary');
const { getSecProfile } = require('../../controllers/stocks/secProfile');

// ROUTES
router.get('/search', searchStocks); //done

router.get('/:symbol/profile', getCompanyProfile); //done
router.get('/:symbol/metrics', getKeyMetrics); //done
router.get("/:symbol/price-summary", getPriceSummary); //done
router.get("/:symbol/sec-profile", getSecProfile);

router.get('/:symbol/quarterly', quarterlyController.getQuarterlyResults); // done
router.get('/:symbol/shareholding', shareholdingController.getShareholdingPattern); // not working and not on fmp
router.get('/:symbol/balancesheet', getBalanceSheet); //done
router.get('/:symbol/profit-loss', profitlossController.getAnnualProfitLoss); //done
router.get('/:symbol/corporate-actions', corporateactionsController.getCorporateActions); // not working and diff on fmp
router.get('/:symbol/reports', reportsController.getReportsAndFilings); //done
router.get('/:symbol/superinvestors', superinvestorController.getSuperInvestors);// not working and not on fmp
router.get('/:symbol/peers', peercomparisonController.getPeerComparison); // done
router.get('/:symbol/insights', insightsController.getInsights); //done
router.get('/:symbol/news', newsController.getLatestNews); //done

// charts + ratios
router.get('/:symbol/price-chart', getPriceChart);
router.get('/:symbol/volume-chart', getVolumeChart);
router.get('/:symbol/pe-chart', getPEChart);
router.get('/:symbol/pb-chart', getPBChart);
router.get('/:symbol/donut-chart', getDonutChart);
router.get('/:symbol/ratios', getRatios);

module.exports = router;