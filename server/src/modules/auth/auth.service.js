import bcrypt from "bcryptjs";
import { AppError } from "../../shared/errors/app-error.js";
import { User } from "../users/user.model.js";
import { RefreshToken } from "./refresh-token.model.js";
import {
  getRefreshTokenExpiryDate,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./auth.tokens.js";

async function persistRefreshToken(user, refreshToken) {
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: getRefreshTokenExpiryDate(),
  });
}

class AuthService {
  async register({ name, email, password }) {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      throw new AppError("Email is already registered", 409, "EMAIL_IN_USE");
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await persistRefreshToken(user, refreshToken);

    return {
      user: user.toSafeJSON(),
      accessToken,
      refreshToken,
    };
  }

  async login({ email, password }) {
    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await persistRefreshToken(user, refreshToken);

    return {
      user: user.toSafeJSON(),
      accessToken,
      refreshToken,
    };
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      throw new AppError("Refresh token is required", 401, "REFRESH_TOKEN_REQUIRED");
    }

    let payload;

    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError("Invalid refresh token", 401, "INVALID_REFRESH_TOKEN");
    }

    const storedToken = await RefreshToken.findOne({
      tokenHash: hashToken(refreshToken),
      revokedAt: null,
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AppError("Refresh token expired", 401, "REFRESH_TOKEN_EXPIRED");
    }

    const user = await User.findById(payload.sub);

    if (!user) {
      throw new AppError("User not found", 401, "USER_NOT_FOUND");
    }

    storedToken.revokedAt = new Date();
    await storedToken.save();

    const nextAccessToken = signAccessToken(user);
    const nextRefreshToken = signRefreshToken(user);

    await persistRefreshToken(user, nextRefreshToken);

    return {
      user: user.toSafeJSON(),
      accessToken: nextAccessToken,
      refreshToken: nextRefreshToken,
    };
  }

  async logout(refreshToken) {
    if (!refreshToken) {
      return;
    }

    await RefreshToken.findOneAndUpdate(
      { tokenHash: hashToken(refreshToken), revokedAt: null },
      { revokedAt: new Date() },
    );
  }
}

export const authService = new AuthService();
