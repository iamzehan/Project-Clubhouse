const { Router } = require("express");
const clubsRouter = Router();
const authController = require("../controllers/authController");
const controller = require("../controllers/clubsController");

clubsRouter.get("/", authController.ensureAuth, controller.clubGet);
clubsRouter.get("/create", authController.ensureAuth, controller.createClubGet);
clubsRouter.post("/create", authController.ensureAuth, controller.createClubPost);

clubsRouter.get("/join/{:id}", authController.ensureAuth, controller.getJoinForm);
module.exports = clubsRouter;
