const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");
const dbConnectionPromise = require("../config/config");

const auth = async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
    console.log("Waiting for MongoDB connection...");
    await dbConnectionPromise;
}

        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];

        if (!token || token === "null" || token === "undefined") {
            return res.status(401).json({ message: "Invalid token format" });
        }

        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET environment variable is missing.");
            return res.status(500).json({ message: "Server authentication is not configured" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        req.user = {
            id: user._id,
            role: user.role,
            email: user.email,
            approved: user.approved,
            viewAccess: user.viewAccess,
            canEditSchedule: user.canEditSchedule,
            canSeeSchedule: user.canSeeSchedule,
            canRemoveSchedule: user.canRemoveSchedule,
            canAccessQuotationCalendar: user.canAccessQuotationCalendar,
        };

        next();
    } catch (err) {
        console.error("Auth middleware error:", err.message);
        return res.status(401).json({ message: "Token is not valid" });
    }
};

const adminAuth = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    if (req.user.role !== "admin" && req.user.role !== "subadmin") {
        return res.status(403).json({ message: "Admins only" });
    }

    next();
};

module.exports = { auth, adminAuth };