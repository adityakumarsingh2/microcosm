import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { authRouter } from "./modules/auth/auth.route.js";
import { healthRouter } from "./modules/health/health.route.js";
import { pageRouter } from "./modules/pages/page.route.js";
import { sectionRouter } from "./modules/sections/section.route.js";
import { notebookRouter } from "./modules/notebooks/notebook.route.js";
import { workspaceRouter } from "./modules/workspaces/workspace.route.js";
import { companionRouter } from "./modules/companion/companion.route.js";
import { notFoundHandler } from "./shared/errors/not-found.handler.js";
import { errorHandler } from "./shared/errors/error.handler.js";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173",
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

app.use("/api/v1/health", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/workspaces", workspaceRouter);
app.use("/api/v1", notebookRouter);
app.use("/api/v1", sectionRouter);
app.use("/api/v1", pageRouter);
app.use("/api/v1", companionRouter);

app.use(notFoundHandler);
app.use(errorHandler);
