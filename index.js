const express = require("express");
const cors = require("cors");
require("dotenv").config();
require("./config/config");

const app = express();

const cors = require("cors");

app.use(
  cors({
    origin: "*", // or your domain
    methods: "GET,POST,PUT,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
  })
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
const authRoutes = require("./routes/auth.js");
const adminRoutes = require("./routes/admin.js");

app.use("/api/auth", authRoutes);
app.use("/api/auth/admin", adminRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/crop", cropRoutes);
app.use("/api/products", productRoutes);
app.use("/api/quotationbills", quotationbillRoutes);
app.use("/api/quotations", quotationRoutes);
app.use("/api/schedulebill", scheduleBillRoutes);
app.use("/api/instructions", instructionRoutes);

app.get("/", (req, res) => {
  res.send("Server is up and running!");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
