const express = require("express");
const router = express.Router();
const Quotation = require("../models/Quotation");
const { auth } = require("../middleware/auth");

const mongoose = require("mongoose");

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

// Get quotation count per user (Admin / Subadmin)
router.get("/count/all", auth, roleAuth(["admin", "subadmin"]), async (req, res) => {
  const data = await Quotation.aggregate([
    {
      $group: {
        _id: "$farmerInfo._id",
        totalQuotations: { $sum: 1 },
      },
    },
  ]);

  res.json(data);
});

// GET ALL QUOTATIONS (Admin / Subadmin)
router.get("/all", auth, roleAuth(["admin", "subadmin"]), async (req, res) => {
  try {
    const quotations = await Quotation.find()
      .populate({
        path: "farmerInfo._id",
        select: "name email role approved",
      })
      .sort({ createdAt: -1 });

    res.status(200).json({ quotations });
  } catch (error) {
    console.error("Error fetching quotations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch quotations",
    });
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

// ✅ FIRST: static routes
router.get("/by-user", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("quotations");

    if (!user) {
      return res.json([]);
    }

    res.json(user.quotations);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

router.get("/count/my", auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const count = await Quotation.countDocuments({
      "farmerInfo._id": userId.toString(),
    });

    res.status(200).json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch quotation count" });
  }
});

// ✅ LAST: dynamic route
router.get("/:id", async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    res.status(200).json(quotation);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quotation" });
  }
});

module.exports = router;
