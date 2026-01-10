const { Router } = require("express");
const inboxRouter = Router();
const authController = require("../controllers/authController");
const controller = require("../controllers/clubsController");

inboxRouter.get("/", controller.inboxGET);

module.exports = inboxRouter;