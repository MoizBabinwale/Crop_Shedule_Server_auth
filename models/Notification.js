const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },

    type: {
      type: String,
      enum: ["contact", "system", "quotation"],
      default: "system",
    },

    isRead: { type: Boolean, default: false },

    receiverRole: {
      type: String,
      enum: ["admin", "subadmin"],
      required: true,
    },

    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);
