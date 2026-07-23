import { env } from "../../config/env.js";

const refreshCookieName = "microcosm_refresh";

export function setRefreshCookie(res, refreshToken) {
  res.cookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/api/v1/auth",
  });
}

export function clearRefreshCookie(res) {
  res.clearCookie(refreshCookieName, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: env.nodeEnv === "production" ? "none" : "lax",
    path: "/api/v1/auth",
  });
}

export function getRefreshTokenFromCookies(req) {
  return req.cookies?.[refreshCookieName];
}
