const stockService = require('../../services/stockService');

const getInsights = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await stockService.getInsights(symbol);
    
    res.status(200).json({ 
      success: true, 
      data: data 
    });
  } catch (error) {
    console.error(`Error fetching insights for ${req.params.symbol}:`, error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal Server Error' 
    });
  }
};

module.exports = {
  getInsights
};