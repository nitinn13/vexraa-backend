// Metrics and Cache State Manager

let cache = {};
let moversCache = {};

let totalRequests = 0;
let apiCalls = 0;
let cacheHits = 0;

module.exports = {
  getCache: () => cache,
  setCache: (key, val) => { cache[key] = val; },
  getMoversCache: () => moversCache,
  setMoversCache: (key, val) => { moversCache[key] = val; },

  incrementRequests: () => { totalRequests++; },
  incrementApiCalls: (count = 1) => { apiCalls += count; },
  incrementCacheHits: () => { cacheHits++; },

  getStats: () => ({ totalRequests, apiCalls, cacheHits }),

  clearCache: () => {
    cache = {};
    moversCache = {};
    totalRequests = 0;
    apiCalls = 0;
    cacheHits = 0;
  }
};
