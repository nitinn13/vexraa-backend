// controllers/stocks/growthRatios.js
const { fmpFetch } = require("../../services/fmpservice");


function calcCAGR(current, past, years) {
    if (!current || !past || past === 0) return null;

    return (Math.pow(current / past, 1 / years) - 1) * 100;
}

async function getGrowthRatios(req, res) {
    try {
        const { symbol } = req.params;


        const incomeData = await fmpFetch("income-statement", `symbol=${symbol}&period=annual&limit=6`);

        if (!incomeData || incomeData.length < 2) {
            return res.json({ success: true, data: null });
        }

        const sortedIncome = [...incomeData].reverse();

        const latest = sortedIncome.at(-1);

        const getPast = (years) =>
            sortedIncome[sortedIncome.length - 1 - years];

        // 🔥 Sales Growth (CAGR)
        const salesGrowth = {
            "1Y": calcCAGR(latest.revenue, getPast(1)?.revenue, 1),
            "3Y": calcCAGR(latest.revenue, getPast(3)?.revenue, 3),
            "5Y": calcCAGR(latest.revenue, getPast(5)?.revenue, 5),
        };

        // 🔥 Profit Growth (CAGR)
        const profitGrowth = {
            "1Y": calcCAGR(latest.netIncome, getPast(1)?.netIncome, 1),
            "3Y": calcCAGR(latest.netIncome, getPast(3)?.netIncome, 3),
            "5Y": calcCAGR(latest.netIncome, getPast(5)?.netIncome, 5),
        };

        return res.json({
            success: true,
            symbol,
            data: {
                salesGrowth,
                profitGrowth,
            },
        });

    } catch (err) {
        console.error("Growth Ratios Error:", err.message);
        res.status(500).json({ success: false });
    }
}

module.exports = { getGrowthRatios };