const { Router } = require("express");
const clubsRouter = Router();
const authController = require("../controllers/authController");
const controller = require("../controllers/clubsController");

clubsRouter.get("/", authController.ensureAuth, controller.clubGet);
clubsRouter.get("/create", authController.ensureAuth, controller.createClubGet);
clubsRouter.post("/create", authController.ensureAuth, controller.createClubPost);

// JOIN A CLUB ROUTE
clubsRouter.get("/join/{:id}", authController.ensureAuth, controller.joinClubGet);
clubsRouter.post("/join/{:id}", authController.ensureAuth, controller.joinClubPost);

// Get single Club views
clubsRouter.get("/:id", controller.getClubPage);

// Post something
clubsRouter.post("/:id", authController.ensureAuth, controller.createClubMessagePOST);
module.exports = clubsRouter;
