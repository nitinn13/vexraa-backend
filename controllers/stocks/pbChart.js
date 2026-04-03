// controllers/stocks/pbChart.js
const getPBChart = async (req, res) => {
  try {
    const symbol = req.params.symbol?.toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: "Stock symbol is required" });
    }

    const API_KEY = process.env.FMP_API_KEY;
    if (!API_KEY) {
      throw new Error('Missing FMP_API_KEY on backend');
    }

    const url = `https://financialmodelingprep.com/stable/key-metrics/${symbol}?period=annual&limit=5&apikey=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && typeof data === 'object' && data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (!data || !Array.isArray(data)) {
      throw new Error(`No PB data found for ${symbol}`);
    }

    // Extract PB ratio trends
    const formattedData = data.map(item => ({
      date: item.date,
      pbRatio: item.pbRatio
    }));

    res.status(200).json({
      success: true,
      symbol,
      data: formattedData
    });
  } catch (error) {
    console.error(`Error fetching PB chart for ${req.params.symbol}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getPBChart
};