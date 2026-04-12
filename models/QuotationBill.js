// models/QuotationBill.js
const mongoose = require("mongoose");

const QuotationBillSchema = new mongoose.Schema(
  {
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation" },
    scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: "Schedule", default: null },
    cropId: String,
    cropName: String,
    billDate: Date,
    items: [
      {
        name: String,
        times: Number,
        totalMl: Number,
        ltrKg: Number,
        rate: Number,
        totalAmt: Number,
        category: String,
        bottlePerml: Number,
      },
    ],
    additionalInfo: {
      totalPlants: Number,
      totalAcres: Number,
      totalGuntha: Number,
      totalCost: Number,
      perPlantCost: Number,

      leafProductCost: {
        totalRs: Number,
        perHectare: Number,
        perAcre: Number,
        perBigha: Number,
        perGuntha: Number,
      },
      bioControlCost: {
        totalRs: Number,
        perHectare: Number,
        perAcre: Number,
        perBigha: Number,
        perGuntha: Number,
      },
      fieldInputPrepCost: {
        totalRs: Number,
        perHectare: Number,
        perAcre: Number,
        perBigha: Number,
        perGuntha: Number,
      },
      smokeCost: {
        totalRs: Number,
        perHectare: Number,
        perAcre: Number,
        perBigha: Number,
        perGuntha: Number,
      },
    },
    farmerInfo: {
      name: String,
      place: String,
      tahsil: String,
      district: String,
      state: String,
    },
    acres: Number,
    farmerInfo: {
      name: { type: String },
      place: { type: String },
      tahsil: { type: String },
      district: { type: String },
      state: { type: String },
      number: { type: String },
      email: { type: String },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("QuotationBill", QuotationBillSchema);
