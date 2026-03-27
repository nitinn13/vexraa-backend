const Fuse = require("fuse.js");

let stockCache = [];
let fuse = null;

async function initializeStockSearch() {
  try {
    console.log("📦 Loading stock data...");

    const res = await fetch(
      `https://financialmodelingprep.com/stable/actively-trading-list?apikey=${process.env.FMP_API_KEY}`
    );

    const data = await res.json();

    stockCache = data
      .filter(stock => stock.symbol && stock.name)
      .map(stock => ({
        symbol: stock.symbol,
        name: stock.name,
      }))
      .filter(stock => !stock.symbol.includes("."));

    // 🔥 Create search index
    fuse = new Fuse(stockCache, {
      keys: ["symbol", "name"],
      threshold: 0.25,
    });

    console.log(`✅ Stock search ready (${stockCache.length} stocks)`);
  } catch (err) {
    console.error("❌ Error initializing stock search:", err.message);
  }
}

// 🔍 Search API handler
function searchStocks(req, res) {
  const query = req.query.q?.trim();

  if (!query || !fuse) {
    return res.json([
      { symbol: "AAPL", name: "Apple Inc." },
      { symbol: "TSLA", name: "Tesla Inc." },
      { symbol: "NVDA", name: "NVIDIA Corp." },
      { symbol: "MSFT", name: "Microsoft Corp." },
    ]);
  }

  const results = fuse.search(query, { limit: 10 });

  res.json(results.map(r => r.item));
}

module.exports = {
  initializeStockSearch,
  searchStocks,
};