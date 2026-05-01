const { fmpFetch } = require('./fmpService');
const cacheManager = require('../utils/cache');


const getQuarterlyResults = async (symbol) => {
  // 1. Check Cache (using a unique key for quarterly data)
  const cacheKey = `QUARTERLY_${symbol}`;
  const cache = cacheManager.getCache();
  
  if (cache[cacheKey]) {
    cacheManager.incrementCacheHits();
    return cache[cacheKey];
  }

  // 2. Fetch the data from FMP API (period=quarter&limit=5 as per your spec)
  const rawData = await fmpFetch('income-statement', `symbol=${symbol}&period=quarter&limit=5`);

  if (!rawData || !Array.isArray(rawData)) {
    throw new Error("Could not fetch quarterly results for " + symbol);
  }

  cacheManager.incrementApiCalls(1);

  // 3. Map the data based on TEAM C's Data Mapping Document
  const mappedResults = rawData.map(quarter => {
    return {
      date: quarter.date,
      period: `${quarter.period} ${quarter.date.substring(0, 4)}`, // e.g., "Q3 2023"
      netSales: quarter.revenue || 0,
      totalExpenditure: (quarter.totalOperatingExpenses || 0) + (quarter.costOfRevenue || 0),
      operatingProfit: quarter.operatingIncome || 0,
      otherIncome: quarter.totalOtherIncomeExpensesNet || 0,
      interest: quarter.interestExpense || 0,
      depreciation: quarter.depreciationAndAmortization || 0,
      exceptionalItems: 0 // Defaulting to 0 as per your spec notes
    };
  });

  // 4. Save to cache and return
  cacheManager.setCache(cacheKey, mappedResults);
  return mappedResults;
};


const getAnnualProfitLoss = async (symbol) => {
  // 1. Check Cache
  const cacheKey = `ANNUAL_PL_${symbol}`;
  const cache = cacheManager.getCache();
  
  if (cache[cacheKey]) {
    cacheManager.incrementCacheHits();
    return cache[cacheKey];
  }

  // 2. Fetch data from FMP API (Annual)
  const rawData = await fmpFetch('income-statement', `symbol=${symbol}&period=annual&limit=5`);

  if (!rawData || !Array.isArray(rawData)) {
    throw new Error("Could not fetch annual profit and loss data for " + symbol);
  }

  cacheManager.incrementApiCalls(1);

  // 3. Map the data based on TEAM C's Data Mapping Document
  const mappedResults = rawData.map(yearData => {
    return {
      date: yearData.date,
      year: yearData.calendarYear || yearData.date.substring(0, 4), // Extract year safely
      netSales: yearData.revenue || 0,
      totalExpenditure: (yearData.totalOperatingExpenses || 0) + (yearData.costOfRevenue || 0),
      operatingProfit: yearData.operatingIncome || 0,
      otherIncome: yearData.totalOtherIncomeExpensesNet || 0,
      interest: yearData.interestExpense || 0,
      depreciation: yearData.depreciationAndAmortization || 0,
      exceptionalItems: 0, 
      profitBeforeTax: yearData.incomeBeforeTax || 0,
      tax: yearData.incomeTaxExpense || 0,
      netProfit: yearData.netIncome || 0,
      adjustedEps: yearData.eps || 0
    };
  });

  // 4. Save to cache and return
  cacheManager.setCache(cacheKey, mappedResults);
  return mappedResults;
};


const getPeerComparison = async (symbol) => {
  const cacheKey = `PEERS_${symbol}`;
  const cache = cacheManager.getCache();

  if (cache[cacheKey]) {
    cacheManager.incrementCacheHits();
    return cache[cacheKey];
  }

  // 1. Fetch the list of peer tickers from the stable endpoint
  const peersData = await fmpFetch('stock-peers', `symbol=${symbol}`);

  let extractedPeers = [];

  // 2. Safely extract peers based on the FMP response structure
  if (Array.isArray(peersData) && peersData.length > 0) {
    if (peersData[0].symbol && !peersData[0].peersList) {
      // New Stable API Structure: [{ symbol: 'CJET', price: 1.71 }, { symbol: 'F' }]
      extractedPeers = peersData.map(peer => peer.symbol);
    } else if (peersData[0].peersList) {
      // Legacy Structure A: [{ symbol: "AAPL", peersList: ["MSFT", "GOOGL"] }]
      extractedPeers = peersData[0].peersList;
    } else if (typeof peersData[0] === 'string') {
      // Legacy Structure B: ["MSFT", "GOOGL"]
      extractedPeers = peersData;
    }
  }

  // If we still have no peers, throw an error
  if (extractedPeers.length === 0) {
    throw new Error(`Could not find peers for ${symbol}`);
  }

  cacheManager.incrementApiCalls(1);

  // 3. Add the main symbol to the beginning and limit to 5 peers total
  // This allows the frontend to compare the searched stock against its competitors
  const peersList = [symbol, ...extractedPeers.slice(0, 5)];

  // 4. Fetch Quote and Key Metrics for ALL peers concurrently
  const peerMetricsPromises = peersList.map(async (peerSymbol) => {
    try {
      const [quoteData, metricsData] = await Promise.all([
        fmpFetch('quote', `symbol=${peerSymbol}`), 
        fmpFetch('key-metrics-ttm', `symbol=${peerSymbol}`)
      ]);

      const quote = (quoteData && quoteData.length > 0) ? quoteData[0] : {};
      const metrics = (metricsData && metricsData.length > 0) ? metricsData[0] : {};

      // Map the exact fields required by your frontend documentation
      return {
        symbol: peerSymbol,
        name: quote.name || peerSymbol,
        price: quote.price || 0, 
        mcapBn: quote.marketCap ? +(quote.marketCap / 1000000000).toFixed(2) : 0, 
        pb: metrics.pbRatioTTM ? +metrics.pbRatioTTM.toFixed(2) : 0, 
        pe: metrics.peRatioTTM ? +metrics.peRatioTTM.toFixed(2) : 0, 
        eps: quote.eps ? +quote.eps.toFixed(2) : 0, 
        roe: metrics.roeTTM ? +(metrics.roeTTM * 100).toFixed(2) : 0, 
        roce: metrics.roceTTM ? +(metrics.roceTTM * 100).toFixed(2) : 0, 
        ps: metrics.priceToSalesRatioTTM ? +metrics.priceToSalesRatioTTM.toFixed(2) : 0, 
        evEbitda: metrics.enterpriseValueOverEBITDATTM ? +metrics.enterpriseValueOverEBITDATTM.toFixed(2) : 0 
      };
    } catch (err) {
      console.error(`Error fetching metrics for peer ${peerSymbol}:`, err.message);
      // Return a fallback object so one failed peer doesn't crash the whole table
      return { symbol: peerSymbol, name: peerSymbol, price: 0, mcapBn: 0, pb: 0, pe: 0, eps: 0, roe: 0, roce: 0, ps: 0, evEbitda: 0 };
    }
  });

  // Execute all promises
  const mappedPeers = await Promise.all(peerMetricsPromises);
  
  // Add 2 API calls for each peer processed to our tracker
  cacheManager.incrementApiCalls(peersList.length * 2);

  // 5. Save and return
  cacheManager.setCache(cacheKey, mappedPeers);
  return mappedPeers;
};


// Quick helper function to format "2h ago", "3d ago", etc.
const timeSince = (dateString) => {
  const date = new Date(dateString);
  const seconds = Math.floor((new Date() - date) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return Math.floor(seconds) + "s ago";
};


const getLatestNews = async (symbol) => {
  const cacheKey = `NEWS_${symbol}`;
  const cache = cacheManager.getCache();

  if (cache[cacheKey]) {
    cacheManager.incrementCacheHits();
    return cache[cacheKey];
  }

  // 1. Fetch the news (We pass 'true' as the 3rd argument to use the /api/v3/ path)
const rawData = await fmpFetch('news/stock', `symbols=${symbol}&limit=5`);
  // If FMP returns nothing, return an empty array safely
  if (!rawData || !Array.isArray(rawData)) {
    return [];
  }

  cacheManager.incrementApiCalls(1);

  // 2. Map the data to match TEAM C's Data Mapping Document
  const mappedNews = rawData.map(article => {
    return {
      title: article.title || "No Title",
      publisher: article.site || "Unknown Source", // Publisher
      publishedTime: article.publishedDate ? timeSince(article.publishedDate) : "Just now", // e.g., '2h ago'
      snippet: article.text || "Click to read more about this story.",
      image: article.image || "https://via.placeholder.com/150", // Fallback image just in case
      url: article.url || "#" // Good to pass the actual article link to the frontend!
    };
  });

  // 3. Save to cache and return
  cacheManager.setCache(cacheKey, mappedNews);
  return mappedNews;
};


const getInsights = async (symbol) => {
  const cacheKey = `INSIGHTS_${symbol}`;
  const cache = cacheManager.getCache();

  if (cache[cacheKey]) {
    cacheManager.incrementCacheHits();
    return cache[cacheKey];
  }

  // 1. Fetch Key Metrics and Financial Growth concurrently 
  // Note: key-metrics-ttm gives us current ratios, financial-growth gives us YoY percentages
  const [metricsData, growthData] = await Promise.all([
    fmpFetch('key-metrics-ttm', `symbol=${symbol}`),
    fmpFetch('financial-growth', `symbol=${symbol}&period=annual&limit=1`)
  ]);

  cacheManager.incrementApiCalls(2);

  const metrics = (metricsData && metricsData.length > 0) ? metricsData[0] : {};
  const growth = (growthData && growthData.length > 0) ? growthData[0] : {};

  const strengths = [];
  const limitations = [];

  // 2. Evaluate Logical Thresholds 
  
  // Rule A: Valuation (P/E Ratio)
  if (metrics.peRatioTTM) {
    if (metrics.peRatioTTM > 50) {
      limitations.push(`Trading at a very high valuation with a P/E of ${metrics.peRatioTTM.toFixed(2)}.`);
    } else if (metrics.peRatioTTM > 0 && metrics.peRatioTTM < 20) {
      strengths.push(`Attractive valuation, trading at a low P/E of ${metrics.peRatioTTM.toFixed(2)}.`);
    }
  }

  // Rule B: Revenue Growth
  if (growth.revenueGrowth !== undefined && growth.revenueGrowth !== null) {
    const revGrowthPct = (growth.revenueGrowth * 100).toFixed(2);
    if (growth.revenueGrowth > 0.20) { // Greater than 20%
      strengths.push(`Exceptional revenue growth of ${revGrowthPct}%.`);
    } else if (growth.revenueGrowth < 0) {
      limitations.push(`Experiencing negative revenue growth of ${revGrowthPct}%.`);
    }
  }

  // Rule C: Return on Equity (ROE)
  if (metrics.roeTTM) {
    const roePct = (metrics.roeTTM * 100).toFixed(2);
    if (metrics.roeTTM > 0.15) { // Greater than 15%
      strengths.push(`Strong Return on Equity (ROE) at ${roePct}%, indicating highly efficient use of capital.`);
    } else if (metrics.roeTTM < 0.05) {
      limitations.push(`Weak Return on Equity (ROE) at ${roePct}%.`);
    }
  }

  // Rule D: Debt to Equity
  if (metrics.debtToEquityTTM) {
    if (metrics.debtToEquityTTM > 2.0) { // High debt
      limitations.push(`High debt burden with a Debt-to-Equity ratio of ${metrics.debtToEquityTTM.toFixed(2)}.`);
    } else if (metrics.debtToEquityTTM < 0.5) { // Low debt
      strengths.push(`Healthy balance sheet with a low Debt-to-Equity ratio of ${metrics.debtToEquityTTM.toFixed(2)}.`);
    }
  }

  // Rule E: Profitability (Net Income Growth)
  if (growth.netIncomeGrowth !== undefined && growth.netIncomeGrowth !== null) {
    const netIncGrowthPct = (growth.netIncomeGrowth * 100).toFixed(2);
    if (growth.netIncomeGrowth > 0.15) {
      strengths.push(`Solid net income growth of ${netIncGrowthPct}%.`);
    } else if (growth.netIncomeGrowth < 0) {
      limitations.push(`Net income has declined by ${netIncGrowthPct}%.`);
    }
  }

  // Fallbacks just in case the data is completely flat
  if (strengths.length === 0) strengths.push("Stable core operations with standard market performance.");
  if (limitations.length === 0) limitations.push("No major red flags or critical financial weaknesses identified.");

  // 3. Package and limit to 4 items max 
  const insights = {
    strengths: strengths.slice(0, 4), 
    limitations: limitations.slice(0, 4)
  };

  cacheManager.setCache(cacheKey, insights);
  return insights;
};


const getReportsAndFilings = async (symbol) => {
  const cacheKey = `REPORTS_${symbol}`;
  const cache = cacheManager.getCache();

  if (cache[cacheKey]) {
    cacheManager.incrementCacheHits();
    return cache[cacheKey];
  }

  try {
    // 1. Let's try your newly discovered stable endpoint for SEC Filings!
    // We add the symbol to the query and limit it to the 10 most recent.
    const filingsData = await fmpFetch(
      'sec-filings-financials', 
      `symbol=${symbol}&page=0&limit=10`, 
      'stable'
    ).catch(err => {
      console.log("Stable SEC Filings fetch failed:", err.message);
      return [];
    });

    // 🐛 DEBUG LOG: Let's see exactly what the new API returns!
    console.log(`Raw NEW SEC Filings for ${symbol}:`, JSON.stringify(filingsData).substring(0, 150));

    cacheManager.incrementApiCalls(1);

    // 2. Map the real SEC data if we got it
    let annualReports = [];
    
    if (Array.isArray(filingsData) && filingsData.length > 0) {
      // Filter for 10-K (Annual Reports) just in case the API returns 10-Q (Quarterly) too
      const tenKs = filingsData.filter(f => f.form === '10-K' || f.type === '10-K');
      
      // If filtering leaves us empty, just use whatever the API gave us
      const sourceData = tenKs.length > 0 ? tenKs : filingsData;

      annualReports = sourceData.slice(0, 5).map(filing => ({
        title: `Annual Report ${filing.year || (filing.date ? filing.date.substring(0, 4) : 'N/A')}`,
        date: filing.date || filing.fillingDate || 'N/A',
        link: filing.link || filing.finalLink || '#' // Safely checking multiple possible key names
      }));
    } else {
      // Fallback: If the API is still restricted, use the mock data so the UI doesn't break
      annualReports = [
        { title: "Annual Report 2023", date: "2023-11-03", link: "https://www.sec.gov/Archives/edgar/data/320193/000032019323000106/aapl-20230930.htm" },
        { title: "Annual Report 2022", date: "2022-10-28", link: "https://www.sec.gov/Archives/edgar/data/320193/000032019322000108/aapl-20220924.htm" },
        { title: "Annual Report 2021", date: "2021-10-29", link: "https://www.sec.gov/Archives/edgar/data/320193/000032019321000105/aapl-20210925.htm" }
      ];
    }

    // 3. Keep Transcripts and Ratings as mock data (usually separate premium add-ons)
    const earningsCalls = [
      { title: "Q4 2023 Earnings Call", date: "2023-11-02", link: "#transcript-modal" },
      { title: "Q3 2023 Earnings Call", date: "2023-08-03", link: "#transcript-modal" },
      { title: "Q2 2023 Earnings Call", date: "2023-05-04", link: "#transcript-modal" }
    ];

    const ratings = {
      overallRecommendation: "Strong Buy",
      score: 5,
      agency: "Standard & Poor's / S&P Global"
    };

    const result = {
      annualReports,
      earningsCalls,
      ratings
    };

    cacheManager.setCache(cacheKey, result);
    return result;

  } catch (error) {
    console.error("Error in Reports & Filings:", error.message);
    throw error;
  }
};
module.exports = {
  getQuarterlyResults,
  getAnnualProfitLoss,
  getPeerComparison,
  getLatestNews,
  getInsights,
  getReportsAndFilings
};