import express from "express";
import multer from "multer";
import { requireAuth } from "../auth/auth.middleware.js";
import { uploadImage, getUploadSignature } from "./uploads.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB limit
  },
});

export const uploadsRouter = express.Router();

uploadsRouter.post("/uploads/images", requireAuth, upload.single("image"), uploadImage);
uploadsRouter.post("/uploads/images/signature", requireAuth, getUploadSignature);
