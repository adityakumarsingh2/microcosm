import express from "express";
import multer from "multer";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  uploadDocument,
  listDocuments,
  deleteDocument,
  updateDocumentStatus,
} from "./document.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF documents are supported"), false);
    }
  },
});

export const documentRouter = express.Router();

documentRouter.post("/documents", requireAuth, upload.single("file"), uploadDocument);
documentRouter.get("/documents", requireAuth, listDocuments);
documentRouter.delete("/documents/:id", requireAuth, deleteDocument);
documentRouter.post("/internal/v1/documents/:id/status", updateDocumentStatus);
