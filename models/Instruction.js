const mongoose = require("mongoose");

const instructionSchema = new mongoose.Schema({
  text: { type: String, required: true }, // Instruction text
});

const Instruction = mongoose.model("Instruction", instructionSchema);

module.exports = Instruction;
