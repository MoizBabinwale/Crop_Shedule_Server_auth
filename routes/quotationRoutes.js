const express = require("express");
const router = express.Router();
const Quotation = require("../models/Quotation");
const { auth } = require("../middleware/auth");

const User = require("../models/User");
const roleAuth = require("../middleware/roleAuth");

// Create new quotation
router.post("/", async (req, res) => {
  try {
    const newQuotation = await Quotation.create(req.body);

    // ✅ Get userId from farmerInfo
    const userId = req.body.farmerInfo._id;

    // ✅ Push quotation id into User model
    await User.findByIdAndUpdate(userId, { $push: { quotations: newQuotation._id } }, { new: true });

    res.status(201).json(newQuotation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error creating quotation" });
  }
});

// Get quotation by ID
router.get("/:id", async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    res.status(200).json(quotation);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quotation" });
  }
});

// Get all quotations
router.get("/", auth, roleAuth(["admin", "subadmin"]), async (req, res) => {
  try {
    const quotations = await Quotation.find().sort({ createdAt: -1 });
    res.status(200).json(quotations);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quotations" });
  }
});

// Update quotation
router.put("/:id", auth, roleAuth(["admin", "subadmin"]), async (req, res) => {
  try {
    const updated = await Quotation.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update quotation" });
  }
});

// Delete quotation
router.delete("/:id", auth, roleAuth(["admin", "subadmin"]), async (req, res) => {
  try {
    await Quotation.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Quotation deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete quotation" });
  }
});

router.get("/user", async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("quotations");

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json(user.quotations);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

module.exports = router;
