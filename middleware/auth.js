const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    // ✅ Get token from header
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "No token, authorization denied" });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Check if user exists in DB
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Attach user info to request
    req.user = {
      id: user._id,
      role: user.role,
      email: user.email,
    };

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    res.status(401).json({ message: "Token is not valid" });
  }
};

module.exports = auth;

// Middleware to allow only admin or subadmin
const adminAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "admin" && req.user.role !== "subadmin") {
    return res.status(403).json({ message: "Admin/Subadmin resource. Access denied" });
  }
  next();
};

module.exports = { auth, adminAuth };
