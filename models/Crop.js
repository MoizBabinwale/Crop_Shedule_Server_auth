const mongoose = require("mongoose");

const cropSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    // required: true,
  },
  weeks: {
    type: Number,
    required: true,
  },
  weekInterval: {
    type: Number,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const Crop = mongoose.model("Crop", cropSchema);

module.exports = Crop; // ✅ This is correct
