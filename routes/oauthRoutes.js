const router = require("express").Router();

const passport = require("passport");

const { auth } = require("../middleware/auth");

const User = require("../models/User");

// GOOGLE LOGIN

router.get("/google", (req, res, next) => {
  const stateData = {
    userId: req.query.userId,
    quotationId: req.query.quotationId,
    redirect: req.query.redirect,
  };

  passport.authenticate("google", {
    scope: ["profile", "email", "https://www.googleapis.com/auth/calendar"],

    accessType: "offline",

    prompt: "consent",

    state: JSON.stringify(stateData),
  })(req, res, next);
});
// GOOGLE CALLBACK

router.get(
  "/google/callback",

  passport.authenticate("google", {
    session: false,
    failureRedirect: process.env.GOOGLE_FAILURE_REDIRECT || "/auth/google/failure",
  }),

  async (req, res) => {
    const { token } = req.user;

    res.redirect(`${process.env.GOOGLE_FRONTEND_URL}/google-success?token=${token}`);
  },
);

router.get("/google/failure", (req, res) => {
  return res.status(401).json({ message: "Google authentication failed" });
});

// GET CURRENT USER

router.get(
  "/me",

  auth,

  async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("-password");

      res.json(user);
    } catch (err) {
      console.log(err);

      res.status(500).json({
        message: "Server error",
      });
    }
  },
);

module.exports = router;
