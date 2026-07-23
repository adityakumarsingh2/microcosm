import { AppError } from "../../shared/errors/app-error.js";
import { User } from "../users/user.model.js";
import { verifyAccessToken } from "./auth.tokens.js";

export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return next(new AppError("Access token is required", 401, "ACCESS_TOKEN_REQUIRED"));
  }

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);

    if (!user) {
      return next(new AppError("User not found", 401, "USER_NOT_FOUND"));
    }

    req.user = user;
    return next();
  } catch {
    return next(new AppError("Invalid access token", 401, "INVALID_ACCESS_TOKEN"));
  }
}
