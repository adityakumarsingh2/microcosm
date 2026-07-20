export function errorHandler(error, _req, res, _next) {
  console.error(error);

  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    error: {
      code: error.code || "INTERNAL_SERVER_ERROR",
      message: error.message || "Internal server error",
    },
  });
}
