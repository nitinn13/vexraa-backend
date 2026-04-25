const { fmpFetch } = require("../../services/fmpservice");

let screenerCache = [];
let lastFetched = 0;
const CACHE_DURATION = 1000 * 60 * 30; // 30 mins

// 🔥 Fetch & cache bulk data
async function loadBulkData() {
  const now = Date.now();

  if (screenerCache.length && now - lastFetched < CACHE_DURATION) {
    return screenerCache;
  }

  console.log("📦 Fetching bulk stock data...");

  const data = await fmpFetch("profile-bulk", "part=0");

  screenerCache = data
    .filter(s => s.symbol && !s.symbol.includes(".")) 
    .map(s => ({
      symbol: s.symbol,
      name: s.companyName,
      price: s.price,
      marketCap: s.marketCap,
      sector: s.sector,
      industry: s.industry,
      volume: s.volume,
      beta: s.beta,
      change: s.change,
      changePercentage: s.changePercentage,
    }));

  lastFetched = now;

  console.log(`✅ Screener cache ready (${screenerCache.length} stocks)`);

  return screenerCache;
}

// 🔥 Main Screener API
async function getScreenerData(req, res) {
    console.log("🔍 Screener request:", req.query);
  try {
    const {
      marketCapMin,
      marketCapMax,
      priceMin,
      priceMax,
      volumeMin,
      sector,
      betaMin,
      betaMax,
      changeMin,
      changeMax,
      limit = 50
    } = req.query;

    let stocks = await loadBulkData();
    

    // 🔥 Apply filters
    if (marketCapMin)
      stocks = stocks.filter(s => s.marketCap >= Number(marketCapMin));

    if (marketCapMax)
      stocks = stocks.filter(s => s.marketCap <= Number(marketCapMax));

    if (priceMin)
      stocks = stocks.filter(s => s.price >= Number(priceMin));

    if (priceMax)
      stocks = stocks.filter(s => s.price <= Number(priceMax));

    if (volumeMin)
      stocks = stocks.filter(s => s.volume >= Number(volumeMin));

    if (sector)
      stocks = stocks.filter(s =>
        s.sector?.toLowerCase().includes(sector.toLowerCase())
      );

    if (betaMin)
      stocks = stocks.filter(s => s.beta >= Number(betaMin));

    if (betaMax)
      stocks = stocks.filter(s => s.beta <= Number(betaMax));

    if (changeMin)
      stocks = stocks.filter(s => s.changePercentage >= Number(changeMin));

    if (changeMax)
      stocks = stocks.filter(s => s.changePercentage <= Number(changeMax));

    // 🔥 Sort by market cap (default)
    stocks.sort((a, b) => b.marketCap - a.marketCap);

    // 🔥 Limit results
    const finalData = stocks.slice(0, Number(limit));

    return res.json({
      success: true,
      count: finalData.length,
      data: finalData,
    });

  } catch (error) {
    console.error("Screener Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch screener data",
    });
  }
}

module.exports = { getScreenerData };