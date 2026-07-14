const mongoose = require("mongoose");
require("dotenv").config();

const connectionString = process.env.CONNECTION ? process.env.CONNECTION.trim() : null;

if (!connectionString) {
  throw new Error(
    "MongoDB connection string is missing. Set CONNECTION in Vercel Environment Variables."
  );
}

const connectOptions = {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  family: 4,
};

const dbConnectionPromise = mongoose
  .connect(connectionString, connectOptions)
  .then(() => {
    console.log("Successfully connected to MongoDB");
    return mongoose;
  })
 .catch((error) => {
    console.error("MongoDB connection failed:", error);
    throw error;
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

module.exports = dbConnectionPromise;
