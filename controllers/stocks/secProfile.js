const { fmpFetch } = require("../../services/fmpService");

// GET /:symbol/sec-profile
async function getSecProfile(req, res) {
  try {
    const { symbol } = req.params;

    const data = await fmpFetch(
      "sec-profile",
      `symbol=${symbol}`
    );

    if (!data || !data.length) {
      return res.json({
        success: true,
        symbol,
        data: null,
      });
    }

    const company = data[0];

    // 🔥 Clean + structured response for frontend
    const formatted = {
      basic: {
        symbol: company.symbol,
        name: company.registrantName,
        cik: company.cik,
        isin: company.isin,
      },

      classification: {
        sicCode: company.sicCode,
        sicDescription: company.sicDescription,
        industry: company.sicGroup,
      },

      company: {
        ceo: company.ceo,
        description: company.description,
        website: company.website,
      },

      contact: {
        phone: company.phoneNumber,
        businessAddress: company.businessAddress,
        mailingAddress: company.mailingAddress,
      },

      location: {
        city: company.city,
        state: company.state,
        country: company.country,
        postalCode: company.postalCode,
      },

      meta: {
        exchange: company.exchange,
        stateLocation: company.stateLocation,
      }
    };

    res.json({
      success: true,
      symbol,
      data: formatted,
    });

  } catch (error) {
    console.error("SEC Profile Error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to fetch SEC company profile",
    });
  }
}

module.exports = {
  getSecProfile,
};