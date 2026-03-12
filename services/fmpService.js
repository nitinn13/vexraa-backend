const API_KEY = process.env.FMP_API_KEY;

const fmpFetch = async (endpoint, params = '') => {
  if (!API_KEY) {
    throw new Error('Missing FMP_API_KEY on backend');
  }
  const url = `https://financialmodelingprep.com/stable/${endpoint}?apikey=${API_KEY}${params ? '&' + params : ''}`;
  const response = await fetch(url);
  const data = await response.json();
  
  if (data && typeof data === 'object' && data['Error Message']) {
    throw new Error(data['Error Message']);
  }
  return data;
};

module.exports = {
  fmpFetch
};
