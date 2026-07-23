import { AppError } from "../errors/app-error.js";

export function validateRequest(schema) {
  return function validationMiddleware(req, _res, next) {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      return next(new AppError("Invalid request payload", 400, "VALIDATION_ERROR"));
    }

    req.validated = result.data;
    return next();
  };
}
