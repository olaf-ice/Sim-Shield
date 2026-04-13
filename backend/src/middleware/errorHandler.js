const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isDev      = process.env.NODE_ENV === 'development';

  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} → ${statusCode}: ${err.message}`);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
};

module.exports = errorHandler;
