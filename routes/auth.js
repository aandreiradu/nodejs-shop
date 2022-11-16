const express = require("express");
const User = require("../models/user");
const router = express.Router();
const {
  getLogin,
  postLogin,
  postLogout,
  getSignup,
  postSignup,
  getReset,
  postReset,
  getNewPassword,
  postNewUserPassword,
} = require("../controllers/auth");
const { check, body } = require("express-validator");

// LOGIN
router.get("/login", getLogin); // Get Login Page

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email!")
      .normalizeEmail(),
    body("password", "Invalid email or password.")
      .isLength({
        min: 5,
      })
      .isAlphanumeric()
      .trim(),
  ],
  postLogin
);

router.get("/signup", getSignup);

router.post(
  "/signup",
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email!")
      .custom(async (value, { req }) => {
        console.log("value is", value);
        // check if the user exists based on email
        const existingUser = await User.findOne({ email: value }).exec();
        console.log("existingUser", existingUser);
        if (existingUser) {
          return Promise.reject(
            "Email already in use. Please pick another one"
          );
        }
      })
      .normalizeEmail(),
    body(
      "password",
      "Please enter a passwrod with only numbers and text and at least 5 characters"
    )
      .isLength({
        min: 5,
      })
      .isAlphanumeric()
      .trim(),
    body("confirmpassword")
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords have to match!");
        }
        return true;
      })
      .trim(),
  ],
  postSignup
);

router.post("/logout", postLogout);

router.get("/reset", getReset);

router.post("/reset", postReset);

router.get("/reset/:token", getNewPassword);

router.post("/new-password", postNewUserPassword);

module.exports = router;
