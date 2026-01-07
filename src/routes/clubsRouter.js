const { Router } = require("express");
const clubsRouter = Router();
const authController = require("../controllers/authController");
clubsRouter.get("/", authController.ensureAuth, (req, res) => {
  res.render("clubs");
});

module.exports = clubsRouter;
