const express = require("express");
const router = express.Router();
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
router.put("/edit/:id", async (req, res) => {
  try {
    const { name, email, role, approved, place, tahsil, district, state } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (place !== undefined) user.place = place;
    if (tahsil !== undefined) user.tahsil = tahsil;
    if (district !== undefined) user.district = district;
    if (state !== undefined) user.state = state;

    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (typeof approved !== "undefined") user.approved = approved;

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

// GET ALL USERS (admin only)
router.get("/get-users", async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $addFields: {
          roleOrder: {
            $switch: {
              branches: [
                { case: { $eq: ["$role", "admin"] }, then: 1 },
                { case: { $eq: ["$role", "subadmin"] }, then: 2 },
              ],
              default: 3, // normal users
            },
          },
        },
      },
      { $sort: { roleOrder: 1 } },
      {
        $project: {
          password: 0,
          roleOrder: 0,
        },
      },
    ]);

    return res.status(200).json({ success: true, users });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
