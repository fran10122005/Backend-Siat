module.exports = {
  globalLimiter: (req, res, next) => next(),
  authLimiter: (req, res, next) => next()
};
