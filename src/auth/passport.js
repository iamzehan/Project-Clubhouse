const passport = require("passport");
const bcrypt = require("bcryptjs");
const db = require("../models/queries");

const LocalStrategy = require("passport-local").Strategy;
const varify = async (username, password, done) => {
  try {
    const user = await db.getUser(username);
    let match;
    if (user) {
      match = await bcrypt.compare(password, user.password_hash);
    }
    if (!user) {
      return done(null, false, { message: `User '${username}' does not exist.` });
    }
    if (!match) {
      return done(null, false, { message: "Incorrect password" });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
};

const strategy = new LocalStrategy(varify);
// local strategy, looks for username and password in the integrated database
passport.use(strategy);

// store a user in the session session
passport.serializeUser((user, done) => {
  done(null, user.id);
});
// retrieve a session user
passport.deserializeUser(async (id, done) => {
  try {
    const user = await db.getUserById(id);
    done(null, user); // user is then passed to the done call back
  } catch (err) {
    // if we find an error we pass the error to the done function
    done(err);
  }
});

module.exports = passport;