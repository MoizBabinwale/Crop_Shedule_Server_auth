const express = require("express");
const router = express.Router();
const Schedule = require("../models/Schedule");
const Crop = require("../models/Crop.js");
const { auth } = require("../middleware/auth.js");
const ScheduleBill = require("../models/ScheduleBill.js");
const User = require("../models/User.js");

const canViewSchedule = (user) => user?.role === "admin" || user?.canSeeSchedule || user?.canEditSchedule || user?.canRemoveSchedule;
const canEditSchedule = (user) => user?.role === "admin" || user?.canEditSchedule;

// GET /schedule/:cropId
router.get("/get/:cropId", async (req, res) => {
  try {
    const cropId = req.params.cropId;
    const schedule = await Schedule.findOne({ cropId });

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    return res.status(200).json(schedule);
  } catch (error) {
    console.error("Error fetching schedule:", error);
    res.status(500).json({ message: "Failed to fetch schedule" });
  }
});

// POST /schedule/create
router.post("/create/:cropId", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin" && !req.user.canEditSchedule) {
      return res.status(403).json({ message: "Access denied" });
    }

    const cropId = req.params.cropId;
    const { weeks, totalPlants } = req.body;
    // ✅ ALWAYS take userId from token

    const userId = req.user.id;

    // 🔐 role from token
    const isSubAdmin = req.user.role === "subadmin";

    // Check if schedule acolready exists
    const existing = await Schedule.findOne({ cropId });

    if (existing) {
      existing.weeks = weeks;
      existing.totalPlants = totalPlants;
      existing.userId = userId;
      // if subadmin edits, re-approval required
      if (isSubAdmin) {
        existing.approved = false;
      }

      const updated = await existing.save();
      return res.status(200).json({
        message: "Schedule updated",
        data: updated,
      });
    }

    // Create new schedule
    const newSchedule = new Schedule({
      cropId,
      weeks,
      totalPlants,
      userId,
      approved: isSubAdmin ? false : true,
    });

    const saved = await newSchedule.save();

    await User.findByIdAndUpdate(userId, { $push: { schedules: saved._id } }, { new: true });

    res.status(201).json({
      message: "Schedule created",
      data: saved,
    });
  } catch (error) {
    console.error("Error creating/updating schedule:", error);
    res.status(500).json({
      message: "Failed to create/update schedule",
      error,
    });
  }
});

// PUT /schedule/approve/:scheduleId
router.put("/approve/:scheduleId", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const updated = await Schedule.findByIdAndUpdate(
      req.params.scheduleId,
      { $set: { approved: true } },
      { new: true, runValidators: false }, // 🔥 important
    );

    if (!updated) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    res.status(200).json({
      message: "Schedule approved successfully",
      data: updated,
    });
  } catch (error) {
    console.error("Approve error:", error);
    res.status(500).json({
      message: "Failed to approve schedule",
    });
  }
});

router.post("/schedulebill/create", auth, async (req, res) => {
  try {
    if (!canEditSchedule(req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const newBill = new ScheduleBill(req.body);
    const saved = await newBill.save();

    // Optionally update the related schedule with bill ID
    await Schedule.findByIdAndUpdate(req.body.scheduleId, { scheduleBillId: saved._id });

    res.status(200).json(saved);
  } catch (err) {
    res.status(500).json({ error: "Schedule bill creation failed" });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    if (!canViewSchedule(req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const scheduleId = req.params.id;

    const schedule = await Schedule.findById(scheduleId).populate("cropId");

    if (!schedule) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    res.status(200).json(schedule);
  } catch (error) {
    console.error("Error fetching schedule by ID:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// 📋 Copy Crop API with week adjustment
router.post("/copyCrop/:cropId", auth, async (req, res) => {
  try {
    if (!canEditSchedule(req.user)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { cropId } = req.params;
    const { name, description, weeks } = req.body;

    const userId = req.user.id;
    const role = req.user.role;

    // ✅ 1. Get original crop
    const oldCrop = await Crop.findById(cropId);
    if (!oldCrop) return res.status(404).json({ message: "Original crop not found" });
    const weekInterval = oldCrop.weekInterval;
    // ✅ 2. Create new crop
    const newCrop = await Crop.create({
      name,
      description,
      weeks,
      userId,
      weekInterval,
    });

    // ✅ 3. Get all schedules of old crop
    const oldSchedules = await Schedule.find({ cropId });

    // ✅ 4. Duplicate schedules with adjusted weeks
    const newSchedules = oldSchedules.map((schedule) => {
      const scheduleObj = schedule.toObject();
      delete scheduleObj._id; // remove old ID

      let oldWeeks = scheduleObj.weeks || [];

      // ✅ Adjust number of weeks
      if (weeks > oldWeeks.length) {
        // Add new blank weeks
        const additionalWeeks = Array.from({ length: weeks - oldWeeks.length }, (_, i) => ({
          weekNumber: oldWeeks.length + i + 1,
          date: null,
          perLiter: "",
          waterPerAcre: "",
          totalAcres: "",
          totalWater: "",
          productAmountMg: "",
          productAmountLtr: "",
          useStartDay: "",
          products: [],
          instructions: "",
        }));
        oldWeeks = [...oldWeeks, ...additionalWeeks];
      } else if (weeks < oldWeeks.length) {
        // Remove extra weeks
        oldWeeks = oldWeeks.slice(0, weeks);
      }

      // ✅ Reassign week numbers sequentially
      oldWeeks = oldWeeks.map((w, i) => ({
        ...w,
        weekNumber: i + 1,
      }));

      return {
        ...scheduleObj,
        cropId: newCrop._id, // link to new crop
        weeks: oldWeeks,
        userId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        approved: role === "admin" ? true : false,
      };
    });

    // newSchedules.forEach((s) => (s.userId = userId));
    // ✅ 5. Insert duplicated schedules
    if (newSchedules.length > 0) {
      await Schedule.insertMany(newSchedules);
    }

    res.status(201).json({
      message: "Crop copied successfully",
      newCrop,
      schedulesCopied: newSchedules.length,
    });
  } catch (error) {
    console.error("Error copying crop:", error);
    res.status(500).json({ message: "Error copying crop", error: error.message });
  }
});

module.exports = router;
