const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const dotenv = require("dotenv");
dotenv.config();

// Register new user
// Register new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, number, password } = req.body;

    // Validate required fields
    if (!name || !number || !password || !email) {
      return res.status(400).json({ message: "Please provide name, email, number, and password" });
    }

    // Check if number already exists
    let existingNumber = await User.findOne({ number });
    if (existingNumber) {
      return res.status(400).json({ message: "Mobile number already exists" });
    }

    // Check if email already exists
    let existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({ name, email, number, password: hashed });
    await user.save();

    res.status(201).json({
      message: "Registered successfully. Waiting for admin approval.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login (users must be approved)
router.post("/login", async (req, res) => {
  try {
    const { number, password } = req.body;

    if (!number || !password) return res.status(400).json({ message: "Please provide email and password" });

    const user = await User.findOne({ number });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // If the user is a normal user, ensure they're approved
    if (user.role === "user" && !user.approved) {
      return res.status(403).json({ message: "Your account is pending admin approval" });
    }

    const payload = { id: user._id, role: user.role, email: user?.email, number: user.number };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
