import { sendSuccess } from "../../shared/responses/api-response.js";
import {
  clearRefreshCookie,
  getRefreshTokenFromCookies,
  setRefreshCookie,
} from "./auth.cookies.js";
import { authService } from "./auth.service.js";

export async function register(req, res) {
  const result = await authService.register(req.validated.body);
  setRefreshCookie(res, result.refreshToken);

  return sendSuccess(
    res,
    {
      user: result.user,
      accessToken: result.accessToken,
    },
    201,
    "Account created",
  );
}

export async function login(req, res) {
  const result = await authService.login(req.validated.body);
  setRefreshCookie(res, result.refreshToken);

  return sendSuccess(res, {
    user: result.user,
    accessToken: result.accessToken,
  });
}

export async function refresh(req, res) {
  const token = getRefreshTokenFromCookies(req);
  const result = await authService.refresh(token);
  setRefreshCookie(res, result.refreshToken);

  return sendSuccess(res, {
    user: result.user,
    accessToken: result.accessToken,
  });
}

export async function logout(req, res) {
  const token = getRefreshTokenFromCookies(req);
  await authService.logout(token);
  clearRefreshCookie(res);

  return sendSuccess(res, null, 200, "Logged out");
}

export function me(req, res) {
  return sendSuccess(res, {
    user: req.user.toSafeJSON(),
  });
}
