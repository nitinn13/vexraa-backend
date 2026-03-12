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
  const cacheKey = symbolsParam || "GAINERS";
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
    // Free API workaround for top gainers: fetch a basket of volatile/popular stocks and sort them
    const basket = [
      "AAPL", "MSFT", "NVDA", "TSLA", "AMZN", 
      "GOOGL", "META", "NFLX", "AMD", "INTC", 
      "PYPL", "SQ", "ROKU", "ZM", "UBER", 
      "LYFT", "SNOW", "PLTR", "CRWD", "DDOG"
    ];
    
    const quotes = await Promise.all(
      basket.map(async (sym) => {
        try { return await fmpFetch('quote', `symbol=${sym}`); }
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
      })
      .sort((a, b) => b.changePercent - a.changePercent)
      .slice(0, 10);
  }

  cacheManager.setMoversCache(cacheKey, {
    data: movers,
    timestamp: Date.now()
  });

  return movers;
};

const getStockHistory = async (symbol) => {
  let basePrice = 200 + symbol.length * 10;
  
  try {
    const cache = cacheManager.getCache();
    if (cache[symbol] && cache[symbol].price) {
      basePrice = cache[symbol].price;
    } else {
      const data = await fmpFetch('quote', `symbol=${symbol}`);
      if (Array.isArray(data) && data[0] && data[0].price) {
        basePrice = data[0].price;
      }
    }
  } catch (e) {
    console.warn("Could not fetch real price for history generation, falling back to synthetic base");
  }

  const points = [];
  
  for (let i = 0; i < 12; i++) {
    const noise = (Math.sin(i * 0.7 + symbol.length) + 1) * (basePrice * 0.05);
    const progress = i / 11;
    const targetPrice = basePrice * (0.4 + progress * 0.6);
    let priceVal = +(targetPrice + noise - (basePrice * 0.05)).toFixed(2);
    if (i === 11) priceVal = basePrice;

    points.push({
      label: `Q${(i % 4) + 1} ${2023 + Math.floor(i / 4)}`,
      price: priceVal,
      pe: +(40 + i * 1.5 - noise * 0.01).toFixed(2),
      pb: +(10 + i * 0.5 - noise * 0.005).toFixed(2),
      roe: +(20 + i * 0.8).toFixed(2),
    });
  }

  const latest = points[points.length - 1];
  const sharesOutstanding = +(1 + (symbol.length % 5) + 0.5).toFixed(2); // In billions
  const marketCap = +(latest.price * sharesOutstanding).toFixed(2); // In billions
  const enterpriseValue = +(marketCap * 0.95).toFixed(2); // Assuming 5% net cash
  const faceValue = symbol.length % 2 === 0 ? 0.001 : 1.0;

  const h = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const mod1 = (h % 10) / 10;
  const mod2 = (h % 20) / 10;

  return {
    symbol,
    priceSeries: points.map(({ label, price }) => ({ label, price })),
    peSeries: points.map(({ label, pe }) => ({ label, pe })),
    pbSeries: points.map(({ label, pb }) => ({ label, pb })),
    essentials: {
      marketCap: `$${marketCap} Bn`,
      enterpriseValue: `$${enterpriseValue} Bn`,
      sharesOutstanding: `${sharesOutstanding}B`,
      faceValue: `$${faceValue}`,
      peRatio: latest.pe.toFixed(2),
      pbRatio: latest.pb.toFixed(2),
    },
    ratios: {
      salesGrowth: [+(15.12 + mod1).toFixed(2), +(35.0 + mod2).toFixed(2), +(40.2 + mod1).toFixed(2), +(42.5 + mod2).toFixed(2)],
      profitGrowth: [+(12.0 + mod2).toFixed(2), +(22.5 + mod1).toFixed(2), +(35.0 + mod2).toFixed(2), +(38.4 + mod1).toFixed(2)],
      roePercent: [+(25.0 + mod1).toFixed(2), +(27.5 + mod2).toFixed(2), +(30.0 + mod1).toFixed(2), latest.roe],
      debtToEquity: +(0.05 + mod1 * 0.1).toFixed(2),
      priceToCashflow: +(50 + mod2 * 20).toFixed(2),
      interestCover: +(30 + mod1 * 30).toFixed(2),
      cfoToPat: +(1.2 + mod2).toFixed(2),
    },
  };
};

const getStockBrands = (symbol) => {
  const known = {
    TSLA: ["Model S", "Model 3", "Model X", "Model Y", "Cybertruck", "Semi", "Roadster", "Powerwall", "Powerpack", "Megapack", "Solar Roof", "Solar Panels", "Supercharger", "Destination Charging", "Tesla Energy", "Tesla Insurance", "Full Self-Driving", "Autopilot", "Tesla App", "Tesla Shop", "Tesla Service", "Tesla Mobile Service", "Tesla Body Shop", "Gigafactory", "Tesla Bot", "Optimus", "Dojo", "Tesla AI"],
    AAPL: ["iPhone", "iPad", "Mac", "Apple Watch", "Apple Vision Pro", "AirPods", "Apple TV", "HomePod", "AirTag", "App Store", "Apple Music", "Apple Pay", "Apple TV+", "Apple Arcade", "iCloud", "Apple News", "Apple Podcasts", "Apple Books", "Apple Card", "Apple Fitness+", "Apple One", "Siri", "iOS", "macOS", "watchOS", "tvOS", "visionOS"],
    MSFT: ["Windows", "Office 365", "Azure", "Xbox", "Surface", "LinkedIn", "GitHub", "Dynamics 365", "Teams", "Skype", "OneDrive", "Bing", "Edge", "Visual Studio", "SQL Server", "Minecraft", "Power BI", "Copilot", "HoloLens"],
    NVDA: ["GeForce", "RTX", "Quadro", "Datacenter", "Tegra", "Shield", "Omniverse", "Drive", "Jetson", "BlueField", "DGX", "CUDA", "TensorRT", "DLSS", "GeForce NOW", "Nvidia Clara", "Nvidia Isaac"],
    AMZN: ["Amazon.com", "AWS", "Prime", "Alexa", "Kindle", "Fire TV", "Echo", "Ring", "Blink", "Eero", "Twitch", "Audible", "Whole Foods", "MGM Studios", "Amazon Fresh", "Amazon Go", "Amazon Basics", "Zappos", "Woot", "Goodreads"],
    META: ["Facebook", "Instagram", "WhatsApp", "Messenger", "Threads", "Meta Quest", "Horizon Worlds", "Ray-Ban Stories", "Spark AR", "Oculus", "Portal", "Workplace", "Llama AI"]
  };

  if (known[symbol]) return known[symbol];

  const baseBrands = ["Cloud Platform", "Analytics Suite", "Core Services", "Enterprise Solutions", "Security Pro", "Data Explorer", "Mobile App", "Desktop Client", "Web Portal", "API Gateway", "Developer Tools", "AI Engine", "Automation Hub", "IoT Connect", "Smart Gateway"];
  const h = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const numBrands = 8 + (h % 12);
  
  const generatedBrands = [];
  for (let i = 0; i < numBrands; i++) {
    const base = baseBrands[(h + i * 3) % baseBrands.length];
    const prefix = symbol.substring(0, 2).charAt(0) + symbol.substring(0, 2).toLowerCase().charAt(1);
    generatedBrands.push(i % 3 === 0 ? `${prefix} ${base}` : base + ` ${i}`);
  }

  return [...new Set(generatedBrands)].slice(0, 28);
};

const getStockIndices = (symbol) => {
  const h = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const indices = [
    { name: "NASDAQ100", title: "NASDAQ 100", value: +(15000 + (h * 15)).toFixed(2), change: +(100 + (h % 50)).toFixed(2), pChange: +(0.5 + (h % 10) * 0.1).toFixed(2), up: h % 2 === 0 },
    { name: "S&P500", title: "S&P 500", value: +(4500 + (h * 5)).toFixed(2), change: +(20 + (h % 30)).toFixed(2), pChange: +(0.3 + (h % 8) * 0.1).toFixed(2), up: h % 3 !== 0 },
    { name: "DJIA", title: "DOW JONES INDUSTRIAL AVERAGE", value: +(35000 + (h * 20)).toFixed(2), change: +(150 + (h % 100)).toFixed(2), pChange: +(0.4 + (h % 5) * 0.1).toFixed(2), up: true },
    { name: "NASDAQ", title: "NASDAQ COMPOSITE", value: +(16000 + (h * 16)).toFixed(2), change: +(90 + (h % 40)).toFixed(2), pChange: +(0.6 + (h % 7) * 0.1).toFixed(2), up: h % 4 !== 0 },
    { name: "S&P100", title: "S&P 100", value: +(2000 + (h * 2)).toFixed(2), change: +(10 + (h % 15)).toFixed(2), pChange: +(0.5 + (h % 5) * 0.1).toFixed(2), up: true },
    { name: "RUSSELL2000", title: "RUSSELL 2000", value: +(2000 + (h * 3)).toFixed(2), change: -(5 + (h % 10)).toFixed(2), pChange: -(0.2 + (h % 3) * 0.1).toFixed(2), up: false },
  ];

  return {
    totalIndices: 24,
    indices: indices.slice(0, 4 + (h % 2))
  };
};

module.exports = {
  getStockProfile,
  getMarketMovers,
  getStockHistory,
  getStockBrands,
  getStockIndices
};
