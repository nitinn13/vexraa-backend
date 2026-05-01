// controllers/stocks/shareholding.js
const { fmpFetch } = require("../../services/fmpservice");

async function getShareholding(req, res) {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: "Symbol is required",
      });
    }

    // =========================
    // 🔥 FETCH DATA (PARALLEL)
    // =========================
    const [profileData, institutionalData, insiderTrades] =
      await Promise.all([
        fmpFetch("profile", `symbol=${symbol}`),
        fmpFetch(
          "institutional-ownership/symbol-positions-summary",
          `symbol=${symbol}&year=2026&quarter=1`
        ),
        fmpFetch(
          "insider-trading/search",
          `symbol=${symbol}&page=0&limit=100`
        ),
      ]);

    // =========================
    // 🔥 TOTAL SHARES
    // =========================
    const profile = profileData?.[0];

    const price = Number(profile?.price || 0);
    const marketCap = Number(profile?.marketCap || 0);

    const totalShares =
      price > 0 ? marketCap / price : 0;

    // =========================
    // 🔥 INSTITUTIONAL
    // =========================
    const inst = institutionalData?.[0];

    const institutionalPercent = Number(
      inst?.lastOwnershipPercent || 0
    );

    // =========================
    // 🔥 INSIDER (LATEST PER PERSON)
    // =========================
    const latestByPerson = {};

    for (const trade of insiderTrades || []) {
      const name = trade.reportingName;
      if (!name) continue;

      const existing = latestByPerson[name];

      if (!existing) {
        latestByPerson[name] = trade;
      } else {
        if (
          new Date(trade.transactionDate) >
          new Date(existing.transactionDate)
        ) {
          latestByPerson[name] = trade;
        }
      }
    }

    // 🔥 Sum insider shares
    let insiderShares = 0;

    Object.values(latestByPerson).forEach((t) => {
      insiderShares += Number(t.securitiesOwned || 0);
    });

    const insiderPercent =
      totalShares > 0
        ? (insiderShares / totalShares) * 100
        : 0;

    // =========================
    // 🔥 CALCULATE SHARES
    // =========================
    const institutionalShares =
      totalShares * (institutionalPercent / 100);

    let retailShares =
      totalShares - institutionalShares - insiderShares;

    // Safety clamp
    if (retailShares < 0) retailShares = 0;

    let retailPercent =
      100 - institutionalPercent - insiderPercent;

    if (retailPercent < 0) retailPercent = 0;

    // =========================
    // 🔥 RESPONSE
    // =========================
    return res.json({
      success: true,
      symbol,

      data: {
        totalShares: Math.round(totalShares),

        institutional: {
          percent: Number(institutionalPercent.toFixed(2)),
          shares: Math.round(institutionalShares),
        },

        insider: {
          percent: Number(insiderPercent.toFixed(2)),
          shares: Math.round(insiderShares),
          uniqueInsiders: Object.keys(latestByPerson).length,
        },

        retail: {
          percent: Number(retailPercent.toFixed(2)),
          shares: Math.round(retailShares),
        },
      },
    });
  } catch (err) {
    console.error("Shareholding Error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Failed to compute shareholding",
    });
  }
}

module.exports = { getShareholding };