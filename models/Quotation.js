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
    // Quotation schema (add this)
    quoBillId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuotationBill",
      default: null,
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
        googleEventId: String,
        whatsappReminderSentAt: Date,
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
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
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
      number: { type: String },
      email: { type: String },
    },
  },
  { timestamps: true },
);

quotationSchema.index({ createdAt: -1 });
module.exports = mongoose.model("Quotation", quotationSchema);
