const notFoundHandler = (req, res, next) => {
  res.status(404).json({ success: false, message: 'Not Found' });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  console.error('[ErrorHandler]', err);
  const statusCode = Number(err.statusCode) || 500;
  const message = err.expose ? err.message : statusCode >= 500 ? 'Internal Server Error' : err.message;

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
