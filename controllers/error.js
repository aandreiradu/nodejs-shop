const get400 = (req, res, next) => {
  // return res.status(404).sendFile(path.join(__dirname, "views", "404.html"));
  return res.status(404).render("404", {
    docTitle: "Page Not Found",
    requestPath: req.get("host") + req.baseUrl,
    "404CSS": true,
    path: "",
  });
};

const get500 = (req, res, next) => {
  return res.status(500).render("500", {
    docTitle: "Internal Server Error",
    requestPath: req.get("host") + req.baseUrl,
    path: "",
  });
};

module.exports = { get400, get500 };
