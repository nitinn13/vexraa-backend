const cacheManager = require('../utils/cache');

const getStats = (req, res) => {
  res.json(cacheManager.getStats());
};

const clearCache = (req, res) => {
  cacheManager.clearCache();
  res.json({ message: "Cache cleared" });
};

module.exports = {
  getStats,
  clearCache
};
