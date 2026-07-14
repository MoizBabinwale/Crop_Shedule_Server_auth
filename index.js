const express = require("express");
const cors = require("cors");
require("dotenv").config();
const dbConnectionPromise = require("./config/config");
require("./config/passport");
const { startWhatsAppReminderScheduler } = require("./jobs/scheduler");

const app = express();

app.use(
  cors({
    origin: "*", // or your domain
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
  }),
);

// handle preflight
app.options("*", cors());

app.use(express.json());

const scheduleRoutes = require("./routes/ScheduleRoutes.js");
const cropRoutes = require("./routes/cropRoutes.js");
const productRoutes = require("./routes/productRoutes.js");
const quotationbillRoutes = require("./routes/quotationbillRoutes.js");
const quotationRoutes = require("./routes/quotationRoutes.js");
const scheduleBillRoutes = require("./routes/scheduleBillRoutes.js");
const instructionRoutes = require("./routes/instructionRoutes.js");
const auth = require("./routes/auth.js");
const adminRoutes = require("./routes/admin.js");
const contactRoutes = require("./routes/contactRoutes.js");
const passport = require("passport");
app.use(passport.initialize());

const oauthRoutes = require("./routes/oauthRoutes");
app.use("/auth", oauthRoutes);

app.use("/api/auth", auth);
app.use("/api/auth/admin", adminRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/crop", cropRoutes);
app.use("/api/products", productRoutes);
app.use("/api/quotationbills", quotationbillRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/schedulebill", scheduleBillRoutes);
app.use("/api/instructions", instructionRoutes);
app.use("/api/notifications", contactRoutes);

app.get("/", (req, res) => {
  res.send("Server is up and running!");
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(err.status || 500).json({
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

const PORT = process.env.PORT || 5000;

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

const startServer = async () => {
  try {
    await dbConnectionPromise;
    if (process.env.VERCEL !== "1") {
      app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
      startWhatsAppReminderScheduler();
    }
  } catch (err) {
    console.error("Failed to connect Mongo:", err);
}
};

startServer();

module.exports = app;
