const isAuth = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    console.log("@@@ IS NOT LOGGED IN ISAUTH MIDDLEWARE");
    return res.redirect("/login");
  }

  next();
};

module.exports = isAuth;
