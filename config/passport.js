const passport = require("passport");

const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User = require("../models/User");

const jwt = require("jsonwebtoken");

const Quotation = require("../models/Quotation");

const { addQuotationEvents } = require("../utils/googleCalendar");

const parseOAuthState = (rawState) => {
  if (!rawState) return {};

  try {
    return JSON.parse(rawState);
  } catch (error) {
    console.warn("Invalid Google OAuth state received:", error.message);
    return {};
  }
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,

      clientSecret: process.env.GOOGLE_CLIENT_SECRET,

      callbackURL: process.env.GOOGLE_CALLBACK_URL,

      passReqToCallback: true,
    },

    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          return done(new Error("Google profile did not include an email address."), null);
        }

        const state = parseOAuthState(req.query.state);

        const existingUserId = state.userId;

        const quotationId = state.quotationId;

        const redirectUrl = state.redirect;

        let user;

        // EXISTING USER CONNECT
        if (existingUserId) {
          user = await User.findById(existingUserId);

          if (user) {
            user.email = email;

            user.googleId = profile.id;

            user.googleAccessToken = accessToken;

            if (refreshToken) {
              user.googleRefreshToken = refreshToken;
            }

            user.googleCalendarConnected = true;

            await user.save();
          }
          // =========================
          // AUTO SYNC QUOTATION
          // =========================

          if (user && quotationId) {
            try {
              const quotation = await Quotation.findById(quotationId);

              if (quotation) {
                console.log("[Google Sync] 📅 Auto syncing quotation...");

                await addQuotationEvents(user, quotation);

                console.log("[Google Sync] ✅ Quotation synced automatically");
              }
            } catch (syncError) {
              console.log("Calendar Auto Sync Error:", syncError.message);
            }
          }
        }

        // NORMAL GOOGLE LOGIN
        if (!user) {
          user = await User.findOne({
            email,
          });

          if (user) {
            user.googleId = profile.id;

            user.googleAccessToken = accessToken;

            if (refreshToken) {
              user.googleRefreshToken = refreshToken;
            }

            user.googleCalendarConnected = true;

            await user.save();
          } else {
            user = await User.create({
              name: profile.displayName,

              email,

              approved: false,

              authProvider: "google",

              googleId: profile.id,

              googleAccessToken: accessToken,

              googleRefreshToken: refreshToken,

              googleCalendarConnected: true,

              password: Math.random().toString(36).slice(-8),
            });
          }
        }

        if (!process.env.JWT_SECRET) {
          return done(new Error("JWT_SECRET environment variable is missing."), null);
        }

        const token = jwt.sign(
          {
            id: user._id,
            role: user.role,
            email: user.email,
          },

          process.env.JWT_SECRET,

          { expiresIn: "7d" },
        );

        done(null, {
          user,
          token,
          redirectUrl,
        });
      } catch (err) {
        console.log(err);

        done(err, null);
      }
    },
  ),
);
