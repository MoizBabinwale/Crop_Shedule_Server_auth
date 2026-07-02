const Quotation = require("../models/Quotation");
const { getISTDayBounds, isWhatsAppConfigured, sendQuotationWhatsAppAlert } = require("../utils/whatsapp");

const runWhatsAppReminders = async () => {
  const { start, end, todayKey } = getISTDayBounds();

  if (!isWhatsAppConfigured()) {
    console.warn("[WhatsApp Reminders] Skipped: WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID is missing.");
    return {
      date: todayKey,
      sent: 0,
      skipped: 0,
      failed: 0,
      configured: false,
      results: [],
    };
  }

  const quotations = await Quotation.find({
    weeks: {
      $elemMatch: {
        date: { $gte: start, $lte: end },
        whatsappReminderSentAt: { $exists: false },
      },
    },
  });

  const results = [];
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const quotation of quotations) {
    const dueWeeks = (quotation.weeks || []).filter((week) => {
      if (!week?.date || week.whatsappReminderSentAt) return false;
      const weekDate = new Date(week.date);
      return weekDate >= start && weekDate <= end;
    });

    for (const week of dueWeeks) {
      const farmerNumber = quotation?.farmerInfo?.number;
      if (!farmerNumber) {
        skipped += 1;
        results.push({
          quotationId: quotation._id,
          weekNumber: week.weekNumber,
          status: "skipped",
          reason: "Farmer mobile number is missing",
        });
        continue;
      }

      try {
        const response = await sendQuotationWhatsAppAlert(quotation, week.weekNumber);
        if (response.mode !== "sent") {
          skipped += 1;
          results.push({
            quotationId: quotation._id,
            weekNumber: week.weekNumber,
            status: "skipped",
            reason: response.message,
          });
          continue;
        }

        week.whatsappReminderSentAt = new Date();
        sent += 1;
        results.push({
          quotationId: quotation._id,
          weekNumber: week.weekNumber,
          status: "sent",
          whatsappNumber: response.whatsappNumber,
        });
      } catch (error) {
        failed += 1;
        results.push({
          quotationId: quotation._id,
          weekNumber: week.weekNumber,
          status: "failed",
          reason: error.response?.data?.error?.message || error.message,
        });
      }
    }

    if (dueWeeks.some((week) => week.whatsappReminderSentAt)) {
      quotation.markModified("weeks");
      await quotation.save();
    }
  }

  console.log(`[WhatsApp Reminders] ${todayKey}: sent=${sent}, skipped=${skipped}, failed=${failed}`);

  return {
    date: todayKey,
    sent,
    skipped,
    failed,
    configured: true,
    results,
  };
};

module.exports = {
  runWhatsAppReminders,
};
