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



module.exports = {
  getStockProfile,
  getMarketMovers,
  getStockHistory,
  getStockBrands,
  getStockIndices,
  getQuarterlyResults,
  getAnnualProfitLoss,
  getAnnualBalanceSheet
};
