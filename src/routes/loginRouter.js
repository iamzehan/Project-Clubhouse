const { Router } = require("express");
const logInRouter = Router();
const controller = require("../controllers/authController");
logInRouter.get("/", controller.ensureGuest, (req, res) => {
  res.render("login");
});

// logInRouter.post("/", controller.ensureGuest, controller.signupUserPost);

module.exports = logInRouter;
