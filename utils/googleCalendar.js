const { google } = require("googleapis");
const User = require("../models/User");

const getOAuth2Client = ({ accessToken, refreshToken }) => {
  const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return oauth2Client;
};

const buildEventDescription = (quotation, week) => {
  const defaultProducts = week.products?.length ? week.products.map((product) => `${product.name} (${product.quantity})`).join(", ") : "No product details";

  return [
    `Quotation for ${quotation.cropName || "your crop"}`,
    `Week: ${week.weekNumber || "N/A"}`,
    `Date: ${week.date}`,
    `Instructions: ${week.instructions || "Not provided"}`,
    `Products: ${defaultProducts}`,
  ].join("\n");
};

const addQuotationEvents = async (user, quotation) => {
  if (!user.googleCalendarConnected) {
    return [];
  }

  if (!user.googleRefreshToken && !user.googleAccessToken) {
    throw new Error("No Google credentials available for calendar sync.");
  }

  const oauth2Client = getOAuth2Client({
    accessToken: user.googleAccessToken,
    refreshToken: user.googleRefreshToken,
  });

  // Persist refreshed tokens back to DB when google auth library refreshes them
  oauth2Client.on("tokens", async (tokens) => {
    try {
      const update = {};
      if (tokens.refresh_token) update.googleRefreshToken = tokens.refresh_token;
      if (tokens.access_token) update.googleAccessToken = tokens.access_token;

      if (Object.keys(update).length) {
        await User.findByIdAndUpdate(user._id, update, { new: true });
        console.log(`[Calendar Sync] 🔄 Refreshed Google tokens for user ${user._id}`);
      }
    } catch (err) {
      console.error("Failed to persist refreshed Google tokens:", err);
    }
  });

  console.log(`[Calendar Sync] ▶️ Starting calendar event creation for quotation ${quotation._id}`);
  console.log(`[Calendar Sync] 📊 Weeks count: ${quotation.weeks?.length || 0}`);

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });
  const createdEvents = [];

  for (const week of quotation.weeks || []) {
    if (!week.date) {
      continue;
    }

    const eventDate = new Date(week.date);
    if (Number.isNaN(eventDate.getTime())) {
      continue;
    }

    const eventDateString = eventDate.toISOString().split("T")[0];

    const event = {
      summary: `Quotation reminder: ${quotation.cropName || "Crop"} - Week ${week.weekNumber || "?"}`,
      description: buildEventDescription(quotation, week),
      start: {
        date: eventDateString,
      },
      end: {
        date: eventDateString,
      },
      reminders: {
        useDefault: true,
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });

    week.googleEventId = response.data.id;
    createdEvents.push(response.data);
    console.log(`[Calendar Sync] ✅ Event created: ${response.data.id} for week ${week.weekNumber} (${eventDateString})`);
  }
  await quotation.save();
  if (createdEvents.length === 0) {
    console.log(`[Calendar Sync] ⚠️ No events created (no valid weeks with dates).`);
  } else {
    console.log(`[Calendar Sync] ✅ Successfully created ${createdEvents.length} calendar events!`);
  }

  return createdEvents;
};

const deleteQuotationEvents = async (user, quotation) => {
  if (!user.googleCalendarConnected) {
    return;
  }

  const oauth2Client = getOAuth2Client({
    accessToken: user.googleAccessToken,

    refreshToken: user.googleRefreshToken,
  });

  const calendar = google.calendar({
    version: "v3",
    auth: oauth2Client,
  });

  for (const week of quotation.weeks) {
    if (!week.googleEventId) continue;

    try {
      await calendar.events.delete({
        calendarId: "primary",

        eventId: week.googleEventId,
      });
    } catch (err) {
      console.log("Delete failed", err.message);
    }
  }

  // OPTIONAL CLEAR IDS

  quotation.weeks.forEach((week) => {
    week.googleEventId = "";
  });

  await quotation.save();
};

module.exports = {
  addQuotationEvents,
  deleteQuotationEvents,
};
