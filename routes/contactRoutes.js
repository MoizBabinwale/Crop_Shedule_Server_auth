const express = require("express");
const router = express.Router();
const { submitContact, getNotifications, markAsRead, getContactMessageById } = require("../Controllers/contactController");
const { auth } = require("../middleware/auth");

router.post("/contact", auth, submitContact); // logged-in users
router.post("/contact/guest", submitContact); // guests

module.exports = router;

router.get("/", auth, getNotifications);
router.put("/:id/read", auth, markAsRead);

// 👇 NEW: get full contact message
router.get("/message/:id", auth, getContactMessageById);

module.exports = router;
