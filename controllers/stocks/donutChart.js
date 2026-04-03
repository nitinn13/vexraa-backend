// controllers/stocks/donutChart.js
const getDonutChart = async (req, res) => {
  try {
    const symbol = req.params.symbol?.toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: "Stock symbol is required" });
    }

    const API_KEY = process.env.FMP_API_KEY;
    if (!API_KEY) {
      throw new Error('Missing FMP_API_KEY on backend');
    }

    const url = `https://financialmodelingprep.com/stable/revenue-geographic-segmentation?symbol=${symbol}&apikey=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data && typeof data === 'object' && data['Error Message']) {
      throw new Error(data['Error Message']);
    }

    if (!data || !Array.isArray(data)) {
      throw new Error(`No revenue segmentation data found for ${symbol}`);
    }

    // Extract revenue segmentation data
    const formattedData = data.map(item => ({
      segment: item.segment,
      revenue: item.revenue
    }));

    res.status(200).json({
      success: true,
      symbol,
      data: formattedData
    });
  } catch (error) {
    console.error(`Error fetching donut chart for ${req.params.symbol}:`, error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

module.exports = {
  getDonutChart
};