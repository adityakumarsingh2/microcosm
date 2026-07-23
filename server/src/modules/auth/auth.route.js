import { Router } from "express";
import { asyncHandler } from "../../shared/middleware/async-handler.js";
import { validateRequest } from "../../shared/middleware/validate-request.js";
import { login, logout, me, refresh, register } from "./auth.controller.js";
import { requireAuth } from "./auth.middleware.js";
import { loginSchema, registerSchema } from "./auth.validation.js";

export const authRouter = Router();

authRouter.post("/register", validateRequest(registerSchema), asyncHandler(register));
authRouter.post("/login", validateRequest(loginSchema), asyncHandler(login));
authRouter.post("/refresh", asyncHandler(refresh));
authRouter.post("/logout", asyncHandler(logout));
authRouter.get("/me", asyncHandler(requireAuth), me);
