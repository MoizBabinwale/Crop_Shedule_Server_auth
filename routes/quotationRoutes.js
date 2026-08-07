const express = require("express");
const router = express.Router();
const Quotation = require("../models/Quotation");
const { auth } = require("../middleware/auth");

const mongoose = require("mongoose");

const User = require("../models/User");
const roleAuth = require("../middleware/roleAuth");
const { addQuotationEvents, deleteQuotationEvents } = require("../utils/googleCalendar");
const { sendQuotationWhatsAppAlert } = require("../utils/whatsapp");

router.post("/", auth, async (req, res) => {
  try {
    console.log(`[Quotation] 📝 Creating quotation for user...`);

    const userId = req.body.farmerInfo._id;

    // FIND USER

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // APPROVAL CHECK

    if (!user.approved) {
      return res.status(403).json({
        message: "Your account is pending admin approval",
      });
    }

    // =========================
    // AUTO INJECT USER DATA
    // =========================

    req.body.farmerInfo = {
      _id: user._id,

      // PRIORITY:
      // 1. frontend data
      // 2. db data

      name: req.body.farmerInfo?.name || user.name || "",

      email: req.body.farmerInfo?.email || user.email || "",

      number: req.body.farmerInfo?.number || user.number || "",

      place: req.body.farmerInfo?.place || user.place || "",

      tahsil: req.body.farmerInfo?.tahsil || user.tahsil || "",

      district: req.body.farmerInfo?.district || user.district || "",

      state: req.body.farmerInfo?.state || user.state || "",

      startDate: req.body.farmerInfo?.startDate || "",
    };

    // CREATE QUOTATION
    const quotationPayload = {
      ...req.body,
      createdBy: req.user?.id || req.body.createdBy || null,
    };

    const newQuotation = await Quotation.create(quotationPayload);

    console.log(`[Quotation] ✅ Quotation created: ${newQuotation._id}`);

    // SAVE QUOTATION ID

    user.quotations.push(newQuotation._id);

    await user.save();

    // =========================
    // GOOGLE CALENDAR
    // =========================

    console.log(`[Quotation] 👤 User: ${user._id}, Google Calendar Connected: ${user.googleCalendarConnected}`);

    if (user.googleCalendarConnected && user.isActive !== false) {
      console.log(`[Quotation] 📅 Syncing to Google Calendar...`);

      try {
        await addQuotationEvents(user, newQuotation);

        console.log(`[Quotation] ✅ Calendar sync completed successfully`);
      } catch (calendarError) {
        console.error("[Quotation] ❌ Google Calendar sync failed:", calendarError.message);
      }
    } else if (!user.googleCalendarConnected) {
      console.log(`[Quotation] ⚠️ User hasn't connected Google Calendar`);
    } else if (user.isActive === false) {
      console.log(`[Quotation] ⚠️ Skipping calendar sync because user ${user._id} is inactive`);
    }

    res.status(201).json(newQuotation);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      message: "Error creating quotation",
    });
  }
});
// Get quotation count per user (Admin / Subadmin)
router.get("/count/all", auth, roleAuth(["admin", "subadmin"]), async (req, res) => {
  const data = await Quotation.aggregate([
    {
      $group: {
        _id: "$farmerInfo._id",
        totalQuotations: { $sum: 1 },
      },
    },
  ]);

  res.json(data);
});

// GET ALL QUOTATIONS (Admin / Subadmin)
router.get("/all", auth, roleAuth(["admin", "subadmin"]), async (req, res) => {
  try {
    // Return a lightweight summary for the master list using aggregation and projections
    const pipeline = [
      { $sort: { createdAt: -1 } },
      // Join farmer basic info
      {
        $lookup: {
          from: "users",
          localField: "farmerInfo._id",
          foreignField: "_id",
          as: "farmer",
        },
      },
      { $unwind: { path: "$farmer", preserveNullAndEmptyArrays: true } },
      // Join creator basic info
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "creator",
        },
      },
      { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          cropName: 1,
          acres: 1,
          createdAt: 1,
          isActive: 1,
          "farmerInfo._id": 1,
          "farmerInfo.name": 1,
          "farmerInfo.place": 1,
          "farmerInfo.tahsil": 1,
          "farmerInfo.district": 1,
          "farmerInfo.state": 1,
          "farmer": { name: "$farmer.name", email: "$farmer.email" },
          "creator": { name: "$creator.name", email: "$creator.email", isActive: "$creator.isActive" },
          weeksCount: { $size: { $ifNull: ["$weeks", []] } },
        },
      },
    ];

    const quotations = await Quotation.aggregate(pipeline).allowDiskUse(false);

    res.status(200).json({ quotations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to fetch quotations" });
  }
});

// CALENDAR FEED FOR ADMIN / SUBADMIN
// router.get("/calendar", auth, roleAuth(["admin", "subadmin"]), async (req, res) => {
//   try {
//     if (
//       req.user.role !== "admin" &&
//       !req.user.canAccessQuotationCalendar
//     ) {
//       return res.status(403).json({
//         success: false,
//         message: "You do not have access to the quotation calendar",
//       });
//     }

//     const month = Number(req.query.month);
//     const year = Number(req.query.year);
// console.log("month ",month,year);

//     const match = {
//       isActive: true, // Only active quotations
//     };

//     if (!Number.isNaN(month) && !Number.isNaN(year)) {
//       const startDate = new Date(year, month - 1, 1);
//       const endDate = new Date(year, month, 1);

//       match["weeks.date"] = {
//         $gte: startDate,
//         $lt: endDate,
//       };
//     }

//     const quotations = await Quotation.aggregate([
//       { $match: match },

//       { $sort: { createdAt: -1 } },

//       {
//         $lookup: {
//           from: "users",
//           localField: "farmerInfo._id",
//           foreignField: "_id",
//           as: "farmer",
//           pipeline: [
//             {
//               $project: {
//                 name: 1,
//                 email: 1,
//                 role: 1,
//                 approved: 1,
//               },
//             },
//           ],
//         },
//       },

//       {
//         $unwind: {
//           path: "$farmer",
//           preserveNullAndEmptyArrays: true,
//         },
//       },

//       {
//         $lookup: {
//           from: "users",
//           localField: "createdBy",
//           foreignField: "_id",
//           as: "creator",
//           pipeline: [
//             {
//               $project: {
//                 name: 1,
//                 email: 1,
//                 number: 1,
//                 role: 1,
//               },
//             },
//           ],
//         },
//       },

//       {
//         $unwind: {
//           path: "$creator",
//           preserveNullAndEmptyArrays: true,
//         },
//       },

//       {
//         $project: {
//           cropName: 1,
//           acres: 1,
//           weeks: 1,
//           createdAt: 1,
//           isActive: 1,
//           farmerInfo: {
//             _id: "$farmerInfo._id",
//             name: "$farmerInfo.name",
//             email: "$farmerInfo.email",
//             number: "$farmerInfo.number",
//             place: "$farmerInfo.place",
//             tahsil: "$farmerInfo.tahsil",
//             district: "$farmerInfo.district",
//             state: "$farmerInfo.state",
//             startDate: "$farmerInfo.startDate",
//           },
//           farmer: {
//             _id: "$farmer._id",
//             name: "$farmer.name",
//             email: "$farmer.email",
//           },
//           creator: 1,
//         },
//       },
//     ]);

//     return res.status(200).json({
//       success: true,
//       quotations,
//     });
//   } catch (error) {
//     console.error("Error fetching quotation calendar:", error);

//     return res.status(500).json({
//       success: false,
//       message: "Failed to fetch quotation calendar",
//     });
//   }
// });

router.get("/calendar", auth, roleAuth(["admin", "subadmin"]), async (req, res) => {
  try {
    if (
      req.user.role !== "admin" &&
      !req.user.canAccessQuotationCalendar
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to the quotation calendar",
      });
    }

    const month = Number(req.query.month);
    const year = Number(req.query.year);

    const match = {
      isActive: true,
    };

    let startDate;
    let endDate;

    if (!Number.isNaN(month) && !Number.isNaN(year)) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 1);

      match.weeks = {
        $elemMatch: {
          date: {
            $gte: startDate,
            $lt: endDate,
          },
        },
      };
    }

    const quotations = await Quotation.aggregate([
      {
        $match: match,
      },

      {
        $project: {
          cropName: 1,
          acres: 1,
          createdAt: 1,
          isActive: 1,
          createdBy: 1,
          farmerInfo: 1,

          weeks: {
            $filter: {
              input: "$weeks",
              as: "week",
              cond: {
                $and: [
                  {
                    $gte: [
                      "$$week.date",
                      startDate || new Date("1900-01-01"),
                    ],
                  },
                  {
                    $lt: [
                      "$$week.date",
                      endDate || new Date("3000-01-01"),
                    ],
                  },
                ],
              },
            },
          },
        },
      },

      {
        $sort: {
          createdAt: -1,
        },
      },

      {
        $lookup: {
          from: "users",
          let: {
            farmerId: "$farmerInfo._id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$farmerId"],
                },
              },
            },
            {
              $project: {
                name: 1,
                email: 1,
                role: 1,
                approved: 1,
              },
            },
          ],
          as: "farmer",
        },
      },

      {
        $unwind: {
          path: "$farmer",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $lookup: {
          from: "users",
          let: {
            creatorId: "$createdBy",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$_id", "$$creatorId"],
                },
              },
            },
            {
              $project: {
                name: 1,
                email: 1,
                number: 1,
                role: 1,
              },
            },
          ],
          as: "creator",
        },
      },

      {
        $unwind: {
          path: "$creator",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          cropName: 1,
          acres: 1,
          weeks: 1,
          createdAt: 1,
          isActive: 1,

          farmerInfo: {
            _id: "$farmerInfo._id",
            name: "$farmerInfo.name",
            email: "$farmerInfo.email",
            number: "$farmerInfo.number",
            place: "$farmerInfo.place",
            tahsil: "$farmerInfo.tahsil",
            district: "$farmerInfo.district",
            state: "$farmerInfo.state",
            startDate: "$farmerInfo.startDate",
          },

          farmer: {
            _id: "$farmer._id",
            name: "$farmer.name",
            email: "$farmer.email",
          },

          creator: 1,
        },
      },
    ]).allowDiskUse(false);

    return res.status(200).json({
      success: true,
      quotations,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch quotation calendar",
    });
  }
});

// Update quotation
router.put("/:id/active", auth, async (req, res) => {
  try {
    if (typeof req.body.isActive === "undefined") {
      return res.status(400).json({ message: "isActive field is required" });
    }

    const user = req.user;
    if (!(user.role === "admin" || (user.role === "subadmin" && user.canActiveQuotation))) {
      return res.status(403).json({ message: "Not authorized to change quotation status" });
    }

    const updated = await Quotation.findByIdAndUpdate(
      req.params.id,
      { $set: { isActive: Boolean(req.body.isActive) } },
      { new: true, runValidators: true },
    );

    if (!updated) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    return res.status(200).json(updated);
  } catch (err) {
    console.error("Failed to update quotation active state:", err);
    return res.status(500).json({ error: "Failed to update quotation active state" });
  }
});

router.put("/:id", auth, roleAuth(["admin", "subadmin"]), async (req, res) => {
  try {
    // Only set fields provided in the body to avoid overwriting unintentionally
    const updatePayload = {};
    // If client intentionally sends isActive (boolean or string), respect it
    if (Object.prototype.hasOwnProperty.call(req.body, "isActive")) {
      updatePayload.isActive = req.body.isActive === false ? false : Boolean(req.body.isActive);
    }

    // Allow other fields if sent (name, acres, weeks, farmerInfo etc.)
    const allowedFields = ["cropName", "acres", "weeks", "farmerInfo", "quoBillId"];
    for (const f of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, f)) updatePayload[f] = req.body[f];
    }

    const updated = await Quotation.findByIdAndUpdate(req.params.id, { $set: updatePayload }, { new: true, runValidators: true });
console.log("updated ",updated);

    if (!updated) return res.status(404).json({ message: "Quotation not found" });

    // Return populated full quotation for frontend convenience
    const populated = await Quotation.findById(updated._id)
      .populate({ path: "farmerInfo._id", select: "name email place tahsil district state" })
      .populate({ path: "createdBy", select: "name email number role isActive" });

    res.status(200).json(populated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update quotation" });
  }
});

// Delete quotation
router.delete("/:id", auth, roleAuth(["admin", "subadmin"]), async (req, res) => {
  try {
    await Quotation.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Quotation deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete quotation" });
  }
});

// WHATSAPP ALERT FOR A QUOTATION / WEEK
router.post("/:id/whatsapp-alert", auth, roleAuth(["admin", "subadmin"]), async (req, res) => {
  // const quotation = await Quotation.findById(req.params.id);
  // if (!quotation) {
  //   return res.status(404).json({ message: "Quotation not found" });
  // }

  // console.log(`[WhatsApp] Processing alert for quotation ${req.params.id}`);
  // console.log(`[WhatsApp] Farmer info:`, quotation?.farmerInfo);
  // console.log(`[WhatsApp] Week number:`, req.body?.weekNumber);

  // const result = await sendQuotationWhatsAppAlert(quotation, req.body?.weekNumber);
  // console.log(`[WhatsApp] Result:`, result);
  // return res.status(200).json(result);
  try {
    const { buildWhatsappMessage, buildWhatsappFallbackUrl, normalizeWhatsAppNumber, getWeekSummary } = require("../utils/whatsapp");
    const quotation = await Quotation.findById(req.params.id);

    const rawNumber = quotation?.farmerInfo?.number;
    const whatsappNumber = normalizeWhatsAppNumber(rawNumber);

    if (!whatsappNumber) {
      return res.status(400).json({
        message: "Farmer mobile number is missing or invalid",
        error: err.message,
      });
    }

    const message = buildWhatsappMessage(quotation, req.body?.weekNumber);
    const whatsappUrl = buildWhatsappFallbackUrl(whatsappNumber, message);

    return res.status(200).json({
      message: "WhatsApp link generated",
      mode: "preview",
      whatsappNumber,
      whatsappUrl,
      previewMessage: message,
    });
  } catch (fallbackErr) {
    console.error("❌ Fallback also failed:", fallbackErr.message);
    res.status(500).json({
      message: "Failed to prepare WhatsApp alert",
      error: fallbackErr.message,
    });
  }
  // } catch (err) {
  //   console.error("❌ Failed to send WhatsApp alert:", err.message);
  //   console.error("Stack trace:", err.stack);

  //   // Even if there's an error, try to generate the fallback WhatsApp URL
  // }
});

// RUN DAILY WHATSAPP REMINDERS (for cron services / manual trigger)
router.post("/whatsapp-reminders/run", async (req, res) => {
  try {
    const cronSecret = process.env.WHATSAPP_CRON_SECRET;
    const providedSecret = req.headers["x-cron-secret"] || req.query.secret;

    if (!cronSecret || providedSecret !== cronSecret) {
      return res.status(401).json({ message: "Unauthorized cron request" });
    }

    const { runWhatsAppReminders } = require("../jobs/whatsappReminders");
    const result = await runWhatsAppReminders();
    res.status(200).json(result);
  } catch (err) {
    console.error("Failed to run WhatsApp reminders:", err.message);
    res.status(500).json({
      message: "Failed to run WhatsApp reminders",
      error: err.message,
    });
  }
});

// ✅ FIRST: static routes
router.get("/by-user", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("quotations");

    if (!user) {
      return res.json([]);
    }

    res.json(user.quotations);
  } catch (err) {
    res.status(500).json({ msg: "Server error", error: err.message });
  }
});

router.get("/count/quotaionCount", auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const count = await Quotation.countDocuments({
      "farmerInfo._id": userId.toString(),
    });

    res.status(200).json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch quotation count" });
  }
});

// ✅ LAST: dynamic route
router.get("/:id", async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate({
        path: "farmerInfo._id",
        select: "name email role approved",
      })
      .populate({
        path: "createdBy",
        select: "name email number role",
      });

    if (!quotation) {
      return res.status(404).json({ message: "Quotation not found" });
    }

    res.status(200).json(quotation);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch quotation" });
  }
});

// Delete Google Calendar events for a quotation (one-click)
router.delete("/:id/calendar-sync", auth, async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) return res.status(404).json({ message: "Quotation not found" });

    // Ensure only the quotation owner or admin can remove calendar events
    const requesterId = (req.user?.id || req.user?._id).toString();

    const quotationOwnerId = quotation.farmerInfo._id.toString();
    if (quotationOwnerId !== requesterId) {
      return res.status(403).json({
        message: "Not authorized to remove calendar events for this quotation",
      });
    }
    const user = await User.findById(requesterId);
    if (!user) return res.status(404).json({ message: "User not found" });

    await deleteQuotationEvents(user, quotation);

    res.status(200).json({ message: "Calendar events removed" });
  } catch (err) {
    console.error("Failed to delete calendar events:", err);
    res.status(500).json({ message: "Failed to delete calendar events", error: err.message });
  }
});

module.exports = router;
