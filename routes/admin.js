const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
// const auth = require("../middleware/auth");
const { adminAuth, auth } = require("../middleware/auth");

// Get new (unapproved) users
router.get("/new-users", async (req, res) => {
  try {
    const users = await User.find({ approved: false }).select("-  ").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Approve a user
router.put("/approve/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.approved = true;
    await user.save();

    res.json({ message: "User approved" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Edit user (name, email, role, approved)
router.put("/edit/:id", auth, adminAuth, async (req, res) => {
  try {
    const { name, email, number, role, approved, place, tahsil, district, state, viewAccess, canEditSchedule, canSeeSchedule, canRemoveSchedule } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (place !== undefined) user.place = place;
    if (tahsil !== undefined) user.tahsil = tahsil;
    if (district !== undefined) user.district = district;
    if (state !== undefined) user.state = state;

    if (name) user.name = name;
    if (email) user.email = email;
    if (number !== undefined) user.number = number;
    if (role) user.role = role;
    if (typeof approved !== "undefined") user.approved = approved;
    if (viewAccess && ["none", "all-users", "subadmins"].includes(viewAccess)) user.viewAccess = viewAccess;
    if (typeof canEditSchedule !== "undefined") user.canEditSchedule = canEditSchedule;
    if (typeof canSeeSchedule !== "undefined") user.canSeeSchedule = canSeeSchedule;
    if (typeof canRemoveSchedule !== "undefined") user.canRemoveSchedule = canRemoveSchedule;

    await user.save();
    res.json({ message: "User updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Delete user
router.delete("/delete/:id", async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE USER ROLE
router.put("/update-role/:id", auth, adminAuth, async (req, res) => {
  try {
    const { role } = req.body;

    // Validate role
    if (!["user", "admin", "subadmin"].includes(role)) {
      return res.status(400).json({ message: "You are not valid to do This change" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = role;
    await user.save();

    res.json({ success: true, message: "Role updated successfully", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET ALL USERS WITH QUOTATION COUNT (admin only)
router.get("/get-users", auth, adminAuth, async (req, res) => {
  try {
    const matchStage = {};
    if (req.user.role === "subadmin") {
      if (req.user.viewAccess === "subadmins") {
        matchStage.role = "subadmin";
      } else if (req.user.viewAccess === "none") {
        if (!mongoose.isValidObjectId(req.user.id)) {
          return res.status(400).json({ message: "Invalid user id" });
        }
        matchStage._id = new mongoose.Types.ObjectId(req.user.id);
      }
    }

    const pipeline = [];
    if (Object.keys(matchStage).length > 0) pipeline.push({ $match: matchStage });

    pipeline.push(
      // 1️⃣ Role priority for sorting
      {
        $addFields: {
          roleOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$role", "admin"] }, then: 1 },
                { case: { $eq: ["$role", "subadmin"] }, then: 2 },
              ],
              default: 3,
            },
          },
        },
      },

      // 2️⃣ Lookup quotations created by this user
      {
        $lookup: {
          from: "quotations", // ⚠️ MongoDB collection name (plural, lowercase)
          localField: "_id",
          foreignField: "farmerInfo._id",
          as: "quotations",
        },
      },

      // 3️⃣ Add quotation count
      {
        $addFields: {
          totalQuotations: { $size: "$quotations" },
        },
      },

      // 4️⃣ Sort by role
      { $sort: { roleOrder: 1 } },

      // 5️⃣ Remove sensitive/unwanted fields
      {
        $project: {
          password: 0,
          roleOrder: 0,
          quotations: 0, // ❌ remove heavy array
        },
      },
    );

    const users = await User.aggregate(pipeline);

    return res.status(200).json({ success: true, users });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// routes/adminRoutes.js or authRoutes.js

router.put("/edit-user/:userId", auth, async (req, res) => {
  try {
    // 🔐 Admin only
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, email, number, role, approved, place, tahsil, district, state, viewAccess, canEditSchedule, canSeeSchedule, canRemoveSchedule } = req.body;

    // 🔎 Check email uniqueness
    const emailExists = await User.findOne({
      email,
      _id: { $ne: req.params.userId },
    });
    if (emailExists) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // 🔎 Check number uniqueness
    const numberExists = await User.findOne({
      number,
      _id: { $ne: req.params.userId },
    });
    if (numberExists) {
      return res.status(400).json({ message: "Number already in use" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      {
        name,
        email,
        number,
        role,
        approved,
        place,
        tahsil,
        district,
        state,
        viewAccess,
        canEditSchedule,
        canSeeSchedule,
        canRemoveSchedule,
      },
      { new: true, runValidators: true },
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Edit user error:", error);
    res.status(500).json({
      message: "Failed to update user",
    });
  }
});

module.exports = router;
