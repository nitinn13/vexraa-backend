const { fmpFetch } = require('./fmpService');
const cacheManager = require('../utils/cache');

const getStockProfile = async (symbol) => {
  if (cacheManager.getCache()[symbol]) {
    cacheManager.incrementCacheHits();
    return cacheManager.getCache()[symbol];
  }

  const [quoteData, profileData] = await Promise.all([
    fmpFetch('quote', `symbol=${symbol}`),
    fmpFetch('profile', `symbol=${symbol}`)
  ]);

  if (!quoteData || quoteData.length === 0) {
    throw new Error("Stock not found");
  }

  cacheManager.incrementApiCalls(2);

  const pData = (Array.isArray(profileData) && profileData.length > 0) ? profileData[0] : {};

  const stock = {
    name: quoteData[0].name,
    price: quoteData[0].price,
    dayHigh: quoteData[0].dayHigh,
    dayLow: quoteData[0].dayLow,
    timestamp: quoteData[0].timestamp,
    exchange: quoteData[0].exchange || "N/A",
    change: quoteData[0].change || 0,
    changesPercentage: quoteData[0].changesPercentage || 0,
    sector: pData.sector || "N/A",
    industry: pData.industry || "N/A",
    description: pData.description || "Company description not available.",
    ceo: pData.ceo || "N/A",
    website: pData.website || "",
  };

  cacheManager.setCache(symbol, stock);
  // Re-save total cache
  return stock;
};

const getMarketMovers = async (symbolsParam) => {
  const cacheKey = symbolsParam || "GAINERS_ACTIVES";
  const now = Date.now();
  const moversCache = cacheManager.getMoversCache();

  if (moversCache[cacheKey] && (now - moversCache[cacheKey].timestamp < 5000)) {
    cacheManager.incrementCacheHits();
    return moversCache[cacheKey].data;
  }

  let movers = [];

  if (symbolsParam) {
    const symbols = symbolsParam
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 25);

    const quotes = await Promise.all(
      symbols.map(async (sym) => {
        try { return await fmpFetch('quote', `symbol=${encodeURIComponent(sym)}`); }
        catch (e) { return null; }
      })
    );

    cacheManager.incrementApiCalls(1);

    movers = quotes
      .filter((data) => Array.isArray(data) && data[0] && data[0].symbol)
      .map((data) => {
        const q = data[0];
        return {
          symbol: q.symbol,
          price: Number(q.price ?? 0),
          changePercent:
            q.changePercentage != null
              ? Number(q.changePercentage)
              : q.changesPercentage != null
              ? Number(String(q.changesPercentage).replace("%", ""))
              : Number(q.changePercent ?? 0),
        };
      });
  } else {
    try {
      const data = await fmpFetch('stock_market/actives');
      cacheManager.incrementApiCalls(1);
      
      if (Array.isArray(data)) {
        movers = data.slice(0, 10).map((q) => ({
          symbol: q.symbol,
          price: Number(q.price ?? 0),
          changePercent:
            q.changesPercentage != null
              ? Number(String(q.changesPercentage).replace("%", ""))
              : Number(q.changePercent ?? 0),
        }));
      }
    } catch (e) {
      console.error("Failed to fetch market movers:", e);
    }
  }

  cacheManager.setMoversCache(cacheKey, {
    data: movers,
    timestamp: Date.now()
  });

  return movers;
};

const getStockHistory = async (symbol) => {
  let [historyData, metricsData, quoteData, growthData] = [null, null, null, null];
  
  try {
    const results = await Promise.allSettled([
      fmpFetch(`historical-price-full/${symbol}`, 'timeseries=12'),
      fmpFetch(`key-metrics-ttm/${symbol}`),
      fmpFetch(`quote/${symbol}`),
      fmpFetch(`financial-growth/${symbol}`, 'limit=4')
    ]);
    
    if (results[0].status === 'fulfilled') historyData = results[0].value;
    if (results[1].status === 'fulfilled') metricsData = results[1].value;
    if (results[2].status === 'fulfilled') quoteData = results[2].value;
    if (results[3].status === 'fulfilled') growthData = results[3].value;
    
    cacheManager.incrementApiCalls(results.filter(r => r.status === 'fulfilled').length);
  } catch (e) {
    console.error("Error fetching historical info for", symbol, e);
  }

  let basePrice = 0;
  const qData = (Array.isArray(quoteData) && quoteData.length > 0) ? quoteData[0] : {};
  if (qData.price) basePrice = qData.price;

  let points = [];
  if (historyData && historyData.historical && Array.isArray(historyData.historical)) {
    const hist = historyData.historical.slice(0, 12).reverse();
    points = hist.map((day) => ({
      label: day.date,
      price: +Number(day.close).toFixed(2)
    }));
  } else {
    for (let i = 0; i < 12; i++) points.push({ label: `Day ${i+1}`, price: basePrice });
  }

  const mData = (Array.isArray(metricsData) && metricsData.length > 0) ? metricsData[0] : {};
  
  let salesG = [0, 0, 0, 0];
  let profitG = [0, 0, 0, 0];
  if (Array.isArray(growthData) && growthData.length > 0) {
    const gHist = growthData.slice(0, 4).reverse();
    salesG = gHist.map(g => g.revenueGrowth ? +(g.revenueGrowth * 100).toFixed(2) : 0);
    profitG = gHist.map(g => g.netIncomeGrowth ? +(g.netIncomeGrowth * 100).toFixed(2) : 0);
    while(salesG.length < 4) salesG.push(0);
    while(profitG.length < 4) profitG.push(0);
  }

  // FMP free tier doesn't provide historical PE per day easily without complex requests,
  // so we assign the TTM PE/PB to the series to keep UI functional.
  const currentPE = mData.peRatioTTM || 0;
  const currentPB = mData.pbRatioTTM || 0;

  const sharesOutstanding = qData.sharesOutstanding ? +(qData.sharesOutstanding / 1e9).toFixed(2) : 0;
  const marketCap = qData.marketCap ? +(qData.marketCap / 1e9).toFixed(2) : 0;
  const enterpriseValue = mData.enterpriseValueTTM ? +(mData.enterpriseValueTTM / 1e9).toFixed(2) : marketCap;

  return {
    symbol,
    priceSeries: points,
    peSeries: points.map(p => ({ label: p.label, pe: +currentPE.toFixed(2) })),
    pbSeries: points.map(p => ({ label: p.label, pb: +currentPB.toFixed(2) })),
    essentials: {
      marketCap: `$${marketCap} Bn`,
      enterpriseValue: `$${enterpriseValue} Bn`,
      sharesOutstanding: `${sharesOutstanding}B`,
      faceValue: "N/A", 
      peRatio: currentPE.toFixed(2),
      pbRatio: currentPB.toFixed(2),
    },
    ratios: {
      salesGrowth: salesG,
      profitGrowth: profitG,
      roePercent: [0, 0, 0, mData.roeTTM ? +(mData.roeTTM * 100).toFixed(2) : 0],
      debtToEquity: mData.debtToEquityTTM ? +mData.debtToEquityTTM.toFixed(2) : 0,
      priceToCashflow: mData.priceToOperatingCashFlowsRatioTTM ? +mData.priceToOperatingCashFlowsRatioTTM.toFixed(2) : 0,
      interestCover: mData.interestCoverageTTM ? +mData.interestCoverageTTM.toFixed(2) : 0,
      cfoToPat: 0,
    },
  };
};

const getStockBrands = async (symbol) => {
  const known = {
    TSLA: ["Model S", "Model 3", "Model X", "Model Y", "Cybertruck", "Powerwall"],
    AAPL: ["iPhone", "iPad", "Mac", "Apple Watch", "AirPods", "Apple TV"],
    MSFT: ["Windows", "Office 365", "Azure", "Xbox", "Surface", "Copilot"],
    NVDA: ["GeForce", "RTX", "Datacenter", "Tegra", "Omniverse"],
    AMZN: ["Amazon.com", "AWS", "Prime", "Alexa", "Kindle", "Twitch"],
    META: ["Facebook", "Instagram", "WhatsApp", "Meta Quest", "Threads"]
  };

  if (known[symbol]) return known[symbol];

  try {
    const profile = await fmpFetch('profile', `symbol=${symbol}`);
    cacheManager.incrementApiCalls(1);
    if (profile && profile.length > 0) {
      const p = profile[0];
      const sector = p.sector || "General";
      const industry = p.industry || "";
      return [
        `${p.companyName} Core Services`,
        `${sector} Enterprise Solutions`,
        `${industry} Platform`.trim(),
        `Premium ${sector} Products`
      ].filter(Boolean);
    }
  } catch(e) { }

  return ["Core Services", "Enterprise Solutions", "Cloud Platform"];
};

const getStockIndices = async (symbol) => {
  try {
    const data = await fmpFetch('quotes/index');
    cacheManager.incrementApiCalls(1);
    
    if (Array.isArray(data) && data.length > 0) {
      const targetIndices = ['^GSPC', '^NDX', '^DJI', '^IXIC', '^OEX', '^RUT'];
      const filtered = data.filter(idx => targetIndices.includes(idx.symbol));
      
      const indices = filtered.map(idx => ({
        name: idx.symbol.replace('^', ''),
        title: idx.name,
        value: Number(idx.price || 0).toFixed(2),
        change: Number(idx.change || 0).toFixed(2),
        pChange: Number(idx.changesPercentage || 0).toFixed(2),
        up: Number(idx.change || 0) >= 0
      }));
      
      return {
        totalIndices: indices.length,
        indices: indices.slice(0, 5)
      };
    }
  } catch (e) {
    console.error("Error fetching indices:", e);
  }
  
  return { totalIndices: 0, indices: [] };
};


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


const getAnnualBalanceSheet = async (symbol) => {
  // 1. Check Cache
  const cacheKey = `ANNUAL_BS_${symbol}`;
  const cache = cacheManager.getCache();
  
  if (cache[cacheKey]) {
    cacheManager.incrementCacheHits();
    return cache[cacheKey];
  }

  // 2. Fetch data from FMP API (Annual) 
  const rawData = await fmpFetch('balance-sheet-statement', `symbol=${symbol}&period=annual&limit=5`);

  if (!rawData || !Array.isArray(rawData)) {
    throw new Error("Could not fetch annual balance sheet data for " + symbol);
  }

  cacheManager.incrementApiCalls(1);

  // 3. Map the data based on TEAM C's Data Mapping Document [cite: 74, 76, 77, 78]
  const mappedResults = rawData.map(yearData => {
    return {
      date: yearData.date,
      year: yearData.calendarYear || yearData.date.substring(0, 4),
      shareCapital: yearData.commonStock || 0, // [cite: 76]
      totalReserves: (yearData.retainedEarnings || 0) + (yearData.accumulatedOtherComprehensiveIncomeLoss || 0), // [cite: 77]
      borrowings: yearData.totalDebt || (yearData.shortTermDebt || 0) + (yearData.longTermDebt || 0) // [cite: 78]
    };
  });

  // 4. Save to cache and return
  cacheManager.setCache(cacheKey, mappedResults);
  return mappedResults;
};


const getCorporateActions = async (symbol) => {
  const cacheKey = `CORPORATE_ACTIONS_${symbol}`;
  const cache = cacheManager.getCache();
  
  if (cache[cacheKey]) {
    cacheManager.incrementCacheHits();
    return cache[cacheKey];
  }

  // 1. Fetch both Splits and Dividends concurrently
  const [splitsData, dividendsData] = await Promise.all([
    fmpFetch(`historical-price-full/stock_split/${symbol}`, ''),
    fmpFetch(`historical-price-full/stock_dividend/${symbol}`, '')
  ]);

  // 🐛 DEBUG LOG: Let's see exactly what the stable API is returning
  console.log(`Raw Splits Data for ${symbol}:`, JSON.stringify(splitsData).substring(0, 150));
  console.log(`Raw Dividends Data for ${symbol}:`, JSON.stringify(dividendsData).substring(0, 150));

  cacheManager.incrementApiCalls(2);

  let actions = [];

  // SAFELY EXTRACT ARRAYS (Handles both array directly OR nested in .historical)
  const splitsArray = Array.isArray(splitsData) ? splitsData : (splitsData?.historical || []);
  const dividendsArray = Array.isArray(dividendsData) ? dividendsData : (dividendsData?.historical || []);

  // 2. Process and map Splits
  if (splitsArray.length > 0) {
    const mappedSplits = splitsArray.map(item => ({
      date: item.date, 
      recordDate: item.recordDate || 'N/A',
      type: 'Split',
      ratio: item.numerator && item.denominator ? `${item.numerator}:${item.denominator}` : 'N/A', 
      amount: null
    }));
    actions = [...actions, ...mappedSplits];
  }

  // 3. Process and map Dividends
  if (dividendsArray.length > 0) {
    const mappedDividends = dividendsArray.map(item => ({
      date: item.date, 
      recordDate: item.recordDate || 'N/A',
      type: 'Dividend',
      ratio: null,
      amount: item.adjDividend || item.dividend || 0 
    }));
    actions = [...actions, ...mappedDividends];
  }

  // 4. Sort the combined list by date (newest first)
  actions.sort((a, b) => new Date(b.date) - new Date(a.date));

  // 5. Slice to return only the 15 most recent corporate actions
  const recentActions = actions.slice(0, 15);

  // 6. Save to cache and return
  cacheManager.setCache(cacheKey, recentActions);
  return recentActions;
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


const getSuperInvestors = async (symbol) => {
  const cacheKey = `INVESTORS_${symbol}`;
  const cache = cacheManager.getCache();

  if (cache[cacheKey]) {
    cacheManager.incrementCacheHits();
    return cache[cacheKey];
  }

  try {
    const rawData = await fmpFetch(
      'institutional-ownership/symbol-ownership', 
      `symbol=${symbol}&limit=50`, 
      'stable'
    );

    console.log(`Raw Super Investors Data for ${symbol}:`, JSON.stringify(rawData).substring(0, 150));

    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
      return [];
    }

    cacheManager.incrementApiCalls(1);

    const mappedInvestors = rawData.slice(0, 10).map(investor => {
      const holdingValueBn = investor.marketValue 
        ? `$${(investor.marketValue / 1e9).toFixed(2)} Bn` 
        : investor.value 
          ? `$${(investor.value / 1e9).toFixed(2)} Bn`
          : "Value Not Disclosed";

      return {
        investorName: investor.investorName || investor.investor || investor.name || "Unknown Institution",
        sharesHeld: investor.sharesNumber || investor.shares || 0,
        holdingValueBn,
        portfolioPercentage: investor.ownership || investor.weight || investor.portfolioPercentage || 0,
        dateReported: investor.date || investor.reportDate || investor.filingDate || "N/A"
      };
    });

    cacheManager.setCache(cacheKey, mappedInvestors);
    return mappedInvestors;

  } catch (error) {
    console.error("Failed to fetch real investor data:", error.message);
    return [];
  }
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
  getStockProfile,
  getMarketMovers,
  getStockHistory,
  getStockBrands,
  getStockIndices,
  getQuarterlyResults,
  getAnnualProfitLoss,
  getAnnualBalanceSheet,
  getCorporateActions,
  getPeerComparison,
  getLatestNews,
  getInsights,
  getSuperInvestors,
  getReportsAndFilings
};
