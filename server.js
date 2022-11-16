require("dotenv").config();
const mongoose = require("mongoose");
const express = require("express");
const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");
const bodyParser = require("body-parser");
const path = require("path");
const User = require("./models/user");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const { get400, get500 } = require("./controllers/error");
const throwErrorAndRedirect = require("./utils/throwErrorAndRedirect");
const multer = require("multer");

const app = express();
const csrfProtection = csrf();
const store = new MongoDBStore({
  uri: process.env.DATABASE_URI,
  collection: "sessions",
});

// multer file storage
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  console.log("FILE FILTER", file);
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  }
  cb(null, false);
};

// USING EJS
app.set("view engine", "ejs");
app.set("views", "views");

// built-in middleware for static  files
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images"))); // make images directory public for every request that comes to /images
// urlencodede middleware
app.use(bodyParser.urlencoded({ extended: false }));

// files middleware
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);

app.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

app.use(csrfProtection);
app.use(flash());

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }

      req.user = user;
      next();
    })
    .catch((err) => {
      console.log("@@@ERROR user server middleware", err);
      // throw new Error(err);
      throwErrorAndRedirect(
        `Something went wrong when trying to get data for this session user ${req.session} ${err}`,
        500,
        next
      );
    });
});

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

// 500 status code
app.get("/500", get500);

app.use("*", get400);

app.use((error, req, res, next) => {
  return res.redirect("/500");
});

mongoose
  .connect(process.env.DATABASE_URI)
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`server listening on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("error connecting to db", err);
  });
