const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  number: {
    type: Number,
    required: true,
    unique: true,
    trim: true,
  },

  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ["user", "admin", "subadmin"],
    default: "user",
  },

  approved: {
    type: Boolean,
    default: false,
  },

  /* -----------------------------------------
     STORE ALL QUOTATIONS CREATED BY THIS USER
  ------------------------------------------*/
  quotations: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",
    },
  ],

  /* ----------------------------------------------------
     STORE ALL SCHEDULES CREATED FOR THIS USER BY ADMIN
     (Admin or Subadmin creates schedule for this user)
  ------------------------------------------------------*/
  schedules: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule", // Must match your schedule model name
    },
  ],

  place: { type: String },
  tahsil: { type: String },
  district: { type: String },
  state: { type: String },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
