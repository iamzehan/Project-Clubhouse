const {Router} = require('express');
const signUpRouter = Router();
const controller = require('../controllers/authController');
signUpRouter.get("/", 
    controller.ensureGuest,
    controller.getAllUsers, (req, res)=> {
    res.render("signup",{users: req.users});
})

signUpRouter.post("/", controller.ensureGuest, controller.signupUserPost);

module.exports = signUpRouter;