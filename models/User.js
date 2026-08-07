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
  authProvider: {
    type: String,
    enum: ["local", "google"],
    default: "local",
  },

  number: {
    type: Number,

    unique: true,

    sparse: true,

    required: function () {
      return this.authProvider !== "google";
    },
  },

  password: {
    type: String,

    required: function () {
      return this.authProvider !== "google";
    },
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

  isActive: {
    type: Boolean,
    default: true,
  },

  viewAccess: {
    type: String,
    enum: ["none", "all-users", "subadmins"],
    default: "none",
  },

  canEditSchedule: {
    type: Boolean,
    default: false,
  },

  canSeeSchedule: {
    type: Boolean,
    default: false,
  },

  canRemoveSchedule: {
    type: Boolean,
    default: false,
  },

  canAccessQuotationCalendar: {
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
  googleId: String,

  googleAccessToken: String,

  googleRefreshToken: String,

  googleCalendarConnected: {
    type: Boolean,
    default: false,
  },
canEditQuotation: {
  type: Boolean,
  default: false,
},
canActiveQuotation: {
  type: Boolean,
  default: false,
},
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("User", userSchema);
