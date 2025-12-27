const express = require("express");
const router = express.Router();
const Instruction = require("../models/Instruction.js");

// ➡️ Add a new instruction
router.post("/:id", async (req, res) => {
  try {
    const { text } = req.body;
    const id = req.params.id;
    if (!text) return res.status(400).json({ message: "Instruction text is required" });
    let newInstruction;
    if (!id) {
      newInstruction = new Instruction({ text });
      await newInstruction.save();
    } else {
      newInstruction = await Instruction.findByIdAndUpdate(req.params.id, req.body, { new: true });
    }
    res.status(201).json(newInstruction);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ➡️ Get all instructions
router.get("/", async (req, res) => {
  try {
    const instructions = await Instruction.find();
    res.json(instructions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete instruction
router.post("/delinstruction/:id", async (req, res) => {
  try {
    await Instruction.findByIdAndDelete(req.params.id);
    res.json({ message: "Instruction deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
