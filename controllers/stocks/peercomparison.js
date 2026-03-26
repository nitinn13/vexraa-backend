const stockService = require('../../services/stockService');

const getPeerComparison = async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const data = await stockService.getPeerComparison(symbol);
    
    res.status(200).json({ 
      success: true, 
      data: data 
    });
  } catch (error) {
    console.error(`Error fetching peer comparison for ${req.params.symbol}:`, error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal Server Error' 
    });
  }
};

module.exports = {
  getPeerComparison
};