const { fmpFetch } = require("../../services/fmpService");

async function getPriceSummary(req, res) {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({ error: "Symbol is required" });
    }

    // 🔥 Fetch profile (price + 52W range)
    const profileRes = await fmpFetch("profile", `symbol=${symbol}`);
    const profile = profileRes[0];

    // 🔥 Fetch latest daily data (high/low)
    const priceRes = await fmpFetch(
      "historical-price-eod/full",
      `symbol=${symbol}&limit=1`
    );

    const latest = priceRes?.[0];

    // 🔥 Extract 52W range
    let yearHigh = null;
    let yearLow = null;

    if (profile?.range) {
      const parts = profile.range.split("-");
      yearLow = parseFloat(parts[0]);
      yearHigh = parseFloat(parts[1]);
    }

    const response = {
      price: profile?.price || null,
      dayHigh: latest?.high || null,
      dayLow: latest?.low || null,
      yearHigh,
      yearLow,
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (err) {
    console.error("Price Summary Error:", err.message);

    res.status(500).json({
      success: false,
      error: "Failed to fetch price summary",
    });
  }
}

module.exports = {
  getPriceSummary,
};