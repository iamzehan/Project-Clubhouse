const db = require("../models/queries");
const bcrypt = require("bcryptjs");
const passport = require("../auth/passport");

exports.signupUserPost = async (req, res, next) => {
  try {
    const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const userId = await db.createUser(req.body.username, hashedPassword);
    const rows = await db.createProfile(
      userId,
      req.body.first_name,
      req.body.last_name
    );
    if (rows) {
      res.redirect("/login");
    } else {
      throw new Error();
    }
  } catch (error) {
    console.error(error);
    next(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await db.getAllUsers();
    req.users = users;
    next();
  } catch (err) {
    next(err);
  }
};
exports.postLogin = async (req, res, next) => {
  await passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      return res.render("login", {
        error: info.message,
      });
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect("/");
    });
  })(req, res, next);
};

exports.logout = async (req, res, next) => {
  await req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
};

exports.ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
};

exports.ensureGuest = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
};
