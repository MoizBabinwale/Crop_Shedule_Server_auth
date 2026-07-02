const cron = require("node-cron");
const { runWhatsAppReminders } = require("./whatsappReminders");

const startWhatsAppReminderScheduler = () => {
  if (process.env.WHATSAPP_REMINDERS_ENABLED !== "true") {
    console.log("[Scheduler] WhatsApp reminders are disabled. Set WHATSAPP_REMINDERS_ENABLED=true to enable.");
    return;
  }

  const schedule = process.env.WHATSAPP_REMINDER_CRON || "0 8 * * *";

  cron.schedule(
    schedule,
    async () => {
      try {
        await runWhatsAppReminders();
      } catch (error) {
        console.error("[Scheduler] WhatsApp reminder job failed:", error.message);
      }
    },
    {
      timezone: "Asia/Kolkata",
    },
  );

  console.log(`[Scheduler] WhatsApp reminder cron started (${schedule}, Asia/Kolkata).`);
};

module.exports = {
  startWhatsAppReminderScheduler,
};
