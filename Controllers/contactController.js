const ContactMessage = require("../models/ContactMessage");
const Notification = require("../models/Notification");

const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    const contact = await ContactMessage.create({
      name,
      email,
      subject,
      message,
      createdBy: req.user?.id || null,
    });

    // 🔔 Create notification for admin & subadmin
    await Notification.insertMany([
      {
        title: "नवीन शेतकरी चौकशी",
        message: `${name} sent a new message`,
        type: "contact",
        receiverRole: "admin",
        relatedId: contact._id,
      },
      {
        title: "नवीन शेतकरी चौकशी",
        message: `${name} sent a new message`,
        type: "contact",
        receiverRole: "subadmin",
        relatedId: contact._id,
      },
    ]);

    res.status(201).json({ success: true, message: "Message sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      receiverRole: req.user.role,
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

const markAsRead = async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Failed to update notification" });
  }
};

// 🔍 Get full contact message by ID
const getContactMessageById = async (req, res) => {
  try {
    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    res.json({ success: true, message });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = { submitContact, getNotifications, markAsRead, getContactMessageById };
