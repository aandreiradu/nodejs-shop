const User = require("../models/user");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodemailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const { validationResult } = require("express-validator");

// init transporter
const transporter = nodemailer.createTransport(
  sendgridTransport({
    auth: {
      api_key: process.env.SENDGRID_API_KEY,
    },
  })
);

const getLogin = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  console.log("message", message);
  console.log(req.session);
  res.render("auth/login", {
    docTitle: "Login",
    path: "/login",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
    },
    validationErros: [],
  });
};

const postLogin = async (req, res, next) => {
  const { email, password } = req.body;
  const errors = validationResult(req);
  console.log("errors", errors);

  if (!email || !password) {
    req.flash("error", "Invalid request params");
    return res.redirect("/login");
  }

  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      docTitle: "Login",
      path: "/login",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email,
        password,
      },
      validationErros: errors.array(),
    });
  }

  try {
    const userData = await User.findOne({ email }).exec();
    if (!userData) {
      return res.status(422).render("auth/login", {
        docTitle: "Login",
        path: "/login",
        oldInput: {
          email,
          password,
        },
        errorMessage: "Invalid email or password",
        validationErros: [{ param: "email" }, { param: "password" }],
      });
    }

    console.log("userData", userData);
    const compare = await bcrypt.compare(password, userData.password);
    console.log("compare", compare);

    if (!compare) {
      // invalid password
      console.log("invalid credentials", compare);
      return res.status(422).render("auth/login", {
        docTitle: "Login",
        path: "/login",
        oldInput: {
          email,
          password,
        },
        errorMessage: "Invalid email or password",
        validationErros: [{ param: "email" }, { param: "password" }],
      });
    }

    // save session to req.session (user and isLoggedIn and save to db);
    req.session.user = userData;
    req.session.isLoggedIn = true;
    req.session.save((err) => {
      if (err) {
        console.log("@@@error post login save", err);
      }

      // redirect to home page
      return res.redirect("/");
    });
  } catch (error) {
    console.log("@@@ERROR postlogin auth controller", error);
  }
};

const postLogout = async (req, res, next) => {
  const responeLogout = await req.session.destroy();
  console.log("responeLogout", responeLogout);
  // if(responeLogout){
  return res.redirect("/");
  // }
};

const getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  console.log(req.session);
  res.render("auth/signup", {
    docTitle: "SignUp",
    path: "/signup",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
      confirmpassword: "",
    },
    validationErros: [],
  });
};

const postSignup = async (req, res, next) => {
  const { email, password, confirmpassword } = req.body;
  console.log("received", email, password, confirmpassword);
  const errors = validationResult(req);
  console.log("errors", errors);

  // if (!email || !password || !confirmpassword) {
  //   console.log("invalid request");
  //   return res.redirect("/signup");
  // }

  if (!errors.isEmpty()) {
    console.log("errors array", errors.array());
    return res.status(422).render("auth/signup", {
      docTitle: "SignUp",
      path: "/signup",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email,
        password,
        confirmpassword,
      },
      validationErros: errors.array(),
    });
  }

  try {
    const hasedPassword = await bcrypt.hash(password, 12);
    console.log("hasedPassword", hasedPassword);

    if (hasedPassword) {
      const newUser = new User({
        email: email,
        password: hasedPassword,
        cart: { items: [] },
      });

      const saveUser = await newUser.save();

      if (saveUser) {
        const responseTransporter = await transporter.sendMail({
          to: email,
          from: "raduandrei697@gmail.com",
          subject: "SignUp succeeded!",
          html: "<h1>You successfully signed up</h1>",
        });

        console.log("responseTransporter", responseTransporter);
        return res.redirect("/login");
      }
    }
  } catch (error) {
    console.log("@@@postSignup ERROR", error);
  }
};

const getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }

  return res.render("auth/reset-password", {
    docTitle: "Reset Password",
    path: "/reset",
    errorMessage: message,
  });
};

const postReset = (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    console.log("invalid request params");
    return res.status(400).redirect("/reset");
  }

  crypto.randomBytes(32, async (err, buffer) => {
    if (err) {
      console.log("err");
      return res.redirect("/reset");
    }

    console.log("before tostring", buffer);
    const token = buffer.toString("hex");
    console.log("token is ", token);

    // find user by email input

    try {
      const findUser = await User.findOne({ email }).exec();
      console.log("findUser result", findUser);
      if (!findUser) {
        console.log("no user found reseting password for email", email);
        req.flash("error", "No account found with specified email!");
        return res.status(200).redirect("/reset");
      }

      findUser.resetToken = token;
      findUser.resetTokenExpiration = Date.now() + 3600000; // 1h
      const saveResponse = await findUser.save();
      console.log("saveResponse", saveResponse);

      if (saveResponse) {
        const responseTransporter = await transporter.sendMail({
          to: email,
          from: "raduandrei697@gmail.com",
          subject: "Reset Password",
          html: `
              <p>You requested a password request</p>
              <p>Click this link in order to set a new password(available for 1h). <a href="http://localhost:3600/reset/${token}">link</a></p>
          `,
        });
        console.log("responseTransporter", responseTransporter);
        return res.redirect("/");
      }
    } catch (error) {
      console.log("Error post reset controller", error);
      return res.status(500).redirect("/reset");
    }
  });
};

const getNewPassword = async (req, res, next) => {
  const { token } = req.params;
  console.log("getNewPassword req.params", req.params);

  if (!token) {
    req.flash("error", "Invalid Request Params");
    console.log("no token provided in request");
    return res.status(400).redirect("/reset");
  }

  // search user based on token
  try {
    const findUserByToken = await User.findOne({
      resetToken: token,
      resetTokenExpiration: { $gt: Date.now() },
    }).exec();
    console.log("findUserByToken", findUserByToken);
    if (!findUserByToken) {
      req.flash("error", "No user found or token is expired");
      console.log(
        "no user found for the provided token or token is expired",
        token
      );
      return res.redirect("/reset");
    }

    let message = req.flash("error");
    if (message.length > 0) {
      message = message[0];
    } else {
      message = null;
    }

    console.log("token before send", token);
    res.render("auth/new-password", {
      docTitle: "New Password",
      path: "/new-password",
      errorMessage: message,
      userId: findUserByToken._id.toString(),
      passwordToken: token,
    });
  } catch (error) {
    console.log("@@@ERROR getNewPassword GET CONTROLLER", error);
  }
};

const postNewUserPassword = async (req, res, next) => {
  const { userId, password: newPassword, passwordToken } = req.body;
  console.log("reqbody postNewUserPassword", req.body);

  if (!userId || !newPassword || !passwordToken) {
    req.flash("error", "Invalid Request Params");
    console.log("invalid request params");
    return res.status(400).redirect("/reset");
  }

  try {
    const findUser = await User.findOne({
      resetToken: passwordToken,
      resetTokenExpiration: { $gt: Date.now() },
      _id: userId,
    }).exec();

    if (!findUser) {
      console.log("user not found");
      req.flash("error", "User not found");
      return res.render("/reset");
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 12);
    console.log("newHashedPassword", newHashedPassword);
    if (newHashedPassword) {
      findUser.password = newHashedPassword;
      findUser.resetToken = null;
      findUser.resetTokenExpiration = undefined;

      const resultSave = await findUser.save();

      if (resultSave) {
        return res.redirect("/login");
      } else {
        console.log("save went wrong");
      }
    }
  } catch (error) {
    console.log("@@@ERROR postNewUser", error);
  }
};

module.exports = {
  getLogin,
  postLogin,
  postLogout,
  getSignup,
  postSignup,
  getReset,
  postReset,
  getNewPassword,
  postNewUserPassword,
};
