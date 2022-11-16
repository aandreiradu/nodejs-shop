const throwErrorAndRedirect = (errorMsg, httpStatusCode, cb) => {
  if (!errorMsg) {
    errorMsg = "Something went wrong!";
  }

  if (!httpStatusCode) {
    httpStatusCode = 500;
  }

  const error = new Error(errorMsg);
  error.httpStatuscode = httpStatusCode;

  return cb(error);
};

module.exports = throwErrorAndRedirect;
