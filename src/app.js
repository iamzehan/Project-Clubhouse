/**************************************************
 * Core imports
 **************************************************/
const path = require("node:path");
const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const pool = require("./models/pool");
const csrf = require("csurf");
const flash = require("connect-flash");

/**************************************************
 * App-specific imports
 **************************************************/
const passport = require("./auth/passport");
const routes = require("./routes");

/**************************************************
 * Environment variables
 **************************************************/
require("dotenv").config();

/**************************************************
 * App initialization
 **************************************************/
const app = express();

/**************************************************
 * View engine setup
 **************************************************/
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

/**************************************************
 * Static files
 **************************************************/
const assetsPath = path.join(__dirname, "public");
app.use(express.static(assetsPath));

/**************************************************
 * Development-only: LiveReload
 **************************************************/
if (process.env.NODE_ENV !== "production") {
  const livereload = require("livereload");
  const connectLiveReload = require("connect-livereload");

  const liveReloadServer = livereload.createServer();

  liveReloadServer.watch([
    path.join(__dirname, "views/*.ejs"),
    path.join(__dirname, "public/css"),
    path.join(__dirname, "public/js"),
  ]);

  app.use(connectLiveReload());

  liveReloadServer.server.once("connection", () => {
    setTimeout(() => liveReloadServer.refresh("/"), 50);
  });
}

/**************************************************
 * Body parsers
 **************************************************/
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

/**************************************************
 * Session configuration
 **************************************************/
app.use(
  session({
    store: new pgSession({
      pool: pool,
      tableName: 'session'
    }),
    name: "sid",
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30*24*60*60*1000, // 30 days,
      httpOnly:true,
      secure: false,
      sameSite: "lax"
    }
  })
);

/**************************************************
 * Authentication (Passport)
 **************************************************/
app.use(passport.initialize());
app.use(passport.session());

/**************************************************
 * Flash messages
 **************************************************/
app.use(flash());

/**************************************************
 * CSRF protection (must be AFTER session)
 **************************************************/
app.use(csrf());

/**************************************************
 * Global template variables
 **************************************************/
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.csrfToken = req.csrfToken();
  res.locals.error = req.flash("error");
  res.locals.success = req.flash("success");
  next();
});

/**************************************************
 * Routes
 **************************************************/
const {ensureGuest, ensureAuth} = require('./controllers/authController');

// GUEST ROUTES
// signup route
app.use("/signup", ensureGuest, routes.signUpRouter);
app.use("/login", ensureGuest, routes.logInRouter);

// AUTH ROUTES
app.use("/", ensureAuth, (req, res) => {
  res.render("index");
});



/**************************************************
 * Server
 **************************************************/
const PORT = process.env.PORT || 3000;

app.listen(PORT, (err) => {
  if (err) {
    console.error(err);
  }
  console.log(`Running server on: http://localhost:${PORT}`);
});
