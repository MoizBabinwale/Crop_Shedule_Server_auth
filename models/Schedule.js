const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
  cropId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Crop",
    required: true,
  },
  weeks: [
    {
      weekNumber: Number,
      date: Date,
      perLiter: String,
      waterPerAcre: String,
      totalAcres: String,
      totalWater: String,
      productAmountMg: String,
      productAmountLtr: String,
      useStartDay: String,

      products: [
        {
          name: String,
          quantity: String,
          perLitreMix: String,
          instruction: String,
          category: String,
          rate: Number,
          pricePerAcre: Number,
        },
      ],
      instructions: String,
    },
  ],
  totalPlants: Number,

  scheduleBillId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ScheduleBill",
    default: null,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

module.exports = mongoose.model("Schedule", scheduleSchema);
