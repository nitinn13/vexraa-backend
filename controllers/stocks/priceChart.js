// controllers/stocks/priceChart.js
const getPriceChart = async (req, res) => {
  try {
    const symbol = req.params.symbol?.toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: "Stock symbol is required" });
    }

    const API_KEY = process.env.FMP_API_KEY;
    if (!API_KEY) {
      throw new Error('Missing FMP_API_KEY on backend');
    }

    const url = `https://financialmodelingprep.com/stable/historical-price-full/${symbol}?apikey=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && typeof data === 'object' && data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (!data || !Array.isArray(data.historical)) {
      throw new Error(`No price data found for ${symbol}`);
    }

    // Extract only necessary fields
    const formattedData = data.historical.map(item => ({
      date: item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume
    }));

    res.status(200).json({
      success: true,
      symbol,
      data: formattedData
    });
  } catch (error) {
    console.error(`Error fetching price chart for ${req.params.symbol}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getPriceChart
};