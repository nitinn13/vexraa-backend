// controllers/stocks/ratios.js
const getRatios = async (req, res) => {
  try {
    const symbol = req.params.symbol?.toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: "Stock symbol is required" });
    }

    const API_KEY = process.env.FMP_API_KEY;
    if (!API_KEY) {
      throw new Error('Missing FMP_API_KEY on backend');
    }

    // Fetch ratios data
    const ratiosUrl = `https://financialmodelingprep.com/stable/ratios/${symbol}?period=annual&limit=5&apikey=${API_KEY}`;
    const ratiosResponse = await fetch(ratiosUrl);
    const ratiosData = await ratiosResponse.json();

    if (ratiosData && typeof ratiosData === 'object' && ratiosData['Error Message']) {
      throw new Error(ratiosData['Error Message']);
    }

    // Fetch cash flow and income statement for CFO/PAT calculation
    const [cashFlowResponse, incomeResponse] = await Promise.all([
      fetch(`https://financialmodelingprep.com/stable/cash-flow-statement/${symbol}?apikey=${API_KEY}`),
      fetch(`https://financialmodelingprep.com/stable/income-statement/${symbol}?apikey=${API_KEY}`)
    ]);

    const cashFlowData = await cashFlowResponse.json();
    const incomeData = await incomeResponse.json();

    if (!ratiosData || !Array.isArray(ratiosData) || ratiosData.length === 0) {
      throw new Error(`No ratios data found for ${symbol}`);
    }

    // Get latest ratios
    const latestRatios = ratiosData[0];

    // Calculate CFO/PAT ratio
    let cfoPatRatio = null;
    if (cashFlowData && Array.isArray(cashFlowData) && incomeData && Array.isArray(incomeData)) {
      // Create maps for quick lookup
      const cashFlowMap = new Map();
      const incomeMap = new Map();

      cashFlowData.forEach(cf => {
        if (cf.date && cf.netCashProvidedByOperatingActivities !== undefined) {
          cashFlowMap.set(cf.date, cf.netCashProvidedByOperatingActivities);
        }
      });

      incomeData.forEach(is => {
        if (is.date && is.netIncome !== undefined) {
          incomeMap.set(is.date, is.netIncome);
        }
      });

      // Calculate ratio for latest available data
      for (const [date, cfo] of cashFlowMap) {
        const pat = incomeMap.get(date);
        if (pat !== undefined && pat !== 0) {
          cfoPatRatio = cfo / pat;
          break; // Use the most recent matching data
        }
      }
    }

    // Extract key ratios
    const formattedData = {
      date: latestRatios.date,
      roe: latestRatios.returnOnEquity,
      roce: latestRatios.returnOnCapitalEmployed,
      debtToEquity: latestRatios.debtToEquity,
      priceToCashFlow: latestRatios.priceToCashFlowRatio,
      interestCoverage: latestRatios.interestCoverage,
      cfoPatRatio: cfoPatRatio
    };

    res.status(200).json({
      success: true,
      symbol,
      data: formattedData
    });
  } catch (error) {
    console.error(`Error fetching ratios for ${req.params.symbol}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getRatios
};