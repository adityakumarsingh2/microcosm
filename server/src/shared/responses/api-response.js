export function sendSuccess(res, data, statusCode = 200, message) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(message ? { message } : {}),
  });
}
