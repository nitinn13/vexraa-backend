const { fmpFetch } = require("../../services/fmpService");

async function getCompanyProfile(req, res) {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({ error: "Symbol is required" });
    }

    const data = await fmpFetch("profile", `symbol=${symbol}`);

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "No data found" });
    }

    const p = data[0];

    const response = {
      basic: {
        symbol: p.symbol,
        name: p.companyName,
        price: p.price,
        change: p.change,
        changePercentage: p.changePercentage,
      },

      company: {
        sector: p.sector,
        industry: p.industry,
        ceo: p.ceo,
        employees: p.fullTimeEmployees,
        website: p.website,
        description: p.description,
      },

      market: {
        marketCap: p.marketCap,
        volume: p.volume,
        averageVolume: p.averageVolume,
        beta: p.beta,
        range: p.range,
      },

      location: {
        address: p.address,
        city: p.city,
        state: p.state,
        country: p.country,
      },

      meta: {
        exchange: p.exchangeFullName,
        currency: p.currency,
        ipoDate: p.ipoDate,
      },

      branding: {
        logo: p.image,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Profile error:", error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getCompanyProfile,
};