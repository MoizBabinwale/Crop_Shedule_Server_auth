const express = require("express");
const router = express.Router();
const Crop = require("../models/Crop");
const Schedule = require("../models/Schedule");
const Quotation = require("../models/Quotation");
const { auth } = require("../middleware/auth");

// POST - Add new crop
router.post("/add", auth, async (req, res) => {
  try {
    const { name, description, weeks, weekInterval, userId } = req.body;
    const newCrop = new Crop({ name, description, weeks, weekInterval, userId });
    await newCrop.save();
    res.status(201).json({ message: "Crop added successfully", newCrop });
  } catch (error) {
    res.status(500).json({ error: "Error adding crop" });
  }
});

router.get("/with-bill-status", async (req, res) => {
  try {
    const crops = await Crop.find();

    const schedules = await Schedule.find().select("cropId scheduleBillId");

    const scheduleMap = {};

    schedules.forEach((schedule) => {
      scheduleMap[schedule.cropId.toString()] = {
        scheduleId: schedule._id,
        hasBill: !!schedule.scheduleBillId,
      };
    });

    const result = crops.map((crop) => ({
      ...crop.toObject(),

      scheduleId: scheduleMap[crop._id.toString()]?.scheduleId || null,

      hasBill: scheduleMap[crop._id.toString()]?.hasBill || false,
    }));

    res.status(200).json(result);
  } catch (err) {
    console.log(err);

    res.status(500).json({
      message: "Failed to fetch crops",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const crops = await Crop.find();

    const cropsWithBillStatus = await Promise.all(
      crops.map(async (crop) => {
        const schedule = await Schedule.findOne({ cropId: crop._id });

        return {
          ...crop.toObject(),
          scheduleId: schedule ? schedule._id : null,
          hasBill: schedule?.scheduleBillId ? true : false,
          approved: schedule?.approved ? schedule?.approved : false,
        };
      }),
    );

    res.status(200).json(cropsWithBillStatus);
  } catch (error) {
    console.error("Error fetching crops:", error);
    res.status(500).json({ error: "Error fetching crops" });
  }
});

// GET single crop
router.get("/:id", async (req, res) => {
  try {
    const crop = await Crop.findById(req.params.id);
    if (!crop) return res.status(404).json({ message: "Crop not found" });
    res.json(crop);
  } catch (error) {
    res.status(500).json({ message: "Error fetching crop", error });
  }
});

// PUT - Update a crop
router.put("/:id", async (req, res) => {
  try {
    const updatedCrop = await Crop.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedCrop);
  } catch (error) {
    res.status(500).json({ error: "Failed to update crop" });
  }
});

// DELETE - Delete a crop and its schedules
router.delete("/:id", async (req, res) => {
  try {
    const cropId = req.params.id;
    await Crop.findByIdAndDelete(cropId);
    await Schedule.deleteOne({ cropId }); // or deleteMany if multiple schedules per crop
    res.json({ message: "Crop and associated schedule deleted successfully" });
  } catch (error) {
    console.error("Error deleting crop and schedule:", error);
    res.status(500).json({ error: "Error deleting crop and schedule" });
  }
});

module.exports = router;
