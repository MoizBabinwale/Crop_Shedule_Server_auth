const mongoose = require("mongoose");
// const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

if (!process.env.CONNECTION) {
  console.error("MongoDB connection string is missing. Set CONNECTION in environment variables.");
} else {
  mongoose
    .connect(process.env.CONNECTION)
    .then(() => {
      console.log("Successfully Connected to DB");
    })
    .catch((error) => {
      console.error("Error connecting to MongoDB:", error);
    });
}

module.exports = mongoose;
