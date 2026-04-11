const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { userModel } = require("../../db");
const { authMiddleware } = require("../../middleware");

const userRouter = express.Router();

userRouter.post("/register", async (req, res) => {
  const username = req.body.username?.trim();
  const email = req.body.email?.trim().toLowerCase();
  const { password } = req.body;

  try {
    if (!username || !password || !email) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await userModel.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({ message: "Username or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
      username,
      email,
      password: hashedPassword,
    });

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

userRouter.post("/login", async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const { password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide all fields" });
    }

    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
// 🔥 Get Profile
userRouter.get("/profile", authMiddleware, async (req, res) => {
  try {
    // req.user is already populated and password-excluded by authMiddleware
    const user = req.user;

    // Compute portfolio summary
    const totalInvestment = user.holdings.reduce(
      (acc, h) => acc + h.quantity * h.buyPrice,
      0
    );

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
      },
      holdings: user.holdings,
      summary: {
        totalHoldings: user.holdings.length,
        totalInvestment: Number(totalInvestment.toFixed(2)), // Clean decimal formatting
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🔥 Add or Update Holding
userRouter.post("/add-holding", authMiddleware, async (req, res) => {
  try {
    let {
      symbol,
      stockName,
      quantity,
      buyPrice,
      purchaseDate,
      notes,
    } = req.body;

    // 1. Validation
    if (!symbol || !stockName || !quantity || !buyPrice || !purchaseDate) {
      return res.status(400).json({
        message: "All required fields must be provided",
      });
    }

    if (quantity <= 0 || buyPrice <= 0) {
      return res.status(400).json({
        message: "Quantity and price must be greater than 0",
      });
    }

    symbol = symbol.toUpperCase();
    const user = req.user; // Use user from middleware

    // 2. Check if holding already exists
    const existingHolding = user.holdings.find(
      (h) => h.symbol === symbol
    );

    if (existingHolding) {
      // 3. Weighted Average Logic
      const oldQty = existingHolding.quantity;
      const oldPrice = existingHolding.buyPrice;

      const newQtyTotal = oldQty + Number(quantity);
      const newAvgPrice = ((oldQty * oldPrice) + (quantity * buyPrice)) / newQtyTotal;

      existingHolding.quantity = newQtyTotal;
      existingHolding.buyPrice = Number(newAvgPrice.toFixed(2));
      existingHolding.purchaseDate = purchaseDate; // Updates to latest purchase date
      if (notes) existingHolding.notes = notes;
    } else {
      // 4. Add new holding
      user.holdings.push({
        symbol,
        stockName,
        quantity: Number(quantity),
        buyPrice: Number(buyPrice),
        purchaseDate,
        notes: notes || "",
      });
    }

    // 5. Save the updated user document
    await user.save();

    res.status(201).json({
      success: true,
      message: existingHolding
        ? "Holding updated (merged via weighted average)"
        : "Holding added successfully",
      holdings: user.holdings,
    });

  } catch (error) {
    console.error("Add Holding Error:", error.message);
    res.status(500).json({
      message: "Failed to add/update holding",
    });
  }
});

module.exports = { userRouter };