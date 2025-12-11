const mongoose = require("mongoose");

const quotationSchema = new mongoose.Schema(
  {
    cropId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Crop",
      required: true,
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      required: true,
    },
    cropName: String,
    acres: Number,
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
        instructions: String,
        products: [
          {
            name: String,
            quantity: String,
            perLitreMix: String,
            price: Number,
            instruction: String,
            category: String,
            rate: Number,
          },
        ],
      },
    ],
    farmerInfo: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      name: { type: String, required: true },
      place: { type: String, required: true },
      tahsil: { type: String, required: true },
      district: { type: String, required: true },
      state: { type: String, required: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Quotation", quotationSchema);
