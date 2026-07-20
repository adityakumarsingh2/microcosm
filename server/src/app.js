import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { healthRouter } from "./modules/health/health.route.js";
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
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use("/api/v1/health", healthRouter);

app.use(notFoundHandler);
app.use(errorHandler);
