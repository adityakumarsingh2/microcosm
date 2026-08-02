import fs from "fs";
import path from "path";
import { AppError } from "../../shared/errors/app-error.js";
import { cloudinary } from "../../config/cloudinary.js";
import { env } from "../../config/env.js";
import { DocumentModel } from "./document.model.js";

export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError("PDF file is required", 400);
    }

    const { workspaceId } = req.body;
    if (!workspaceId) {
      throw new AppError("Workspace ID is required", 400);
    }

    const userId = req.user.id;
    let uploadResult;

    const isCloudinaryConfigured =
      env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret;

    if (isCloudinaryConfigured) {
      uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "microcosm_docs",
            resource_type: "raw", // Required for PDF raw format
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary document upload error:", error);
              return reject(new AppError("Failed to upload document to cloud storage", 502));
            }
            resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
    } else {
      // Local dev fallback
      const uploadsDir = path.join(process.cwd(), "uploads", "documents");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filename = `doc_${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const filePath = path.join(uploadsDir, filename);
      fs.writeFileSync(filePath, req.file.buffer);

      // Construct a clean, accessible local URL
      const host = req.get("host");
      const protocol = req.protocol;
      uploadResult = {
        public_id: filename,
        secure_url: `${protocol}://${host}/uploads/documents/${filename}`,
        bytes: req.file.size,
      };
    }

    // Create Document record in MongoDB
    const doc = await DocumentModel.create({
      userId,
      workspaceId,
      title: req.file.originalname || "Document",
      url: uploadResult.secure_url,
      bytes: uploadResult.bytes || req.file.size,
      status: "pending",
    });

    // Fire-and-forget call to the Python AI service
    const payload = {
      documentId: doc._id.toString(),
      workspaceId: workspaceId,
      url: doc.url,
      title: doc.title,
    };

    fetch(`${env.pythonAiServiceUrl}/internal/v1/index/document`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-token": env.internalServiceToken,
      },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text();
          console.error(`[DocumentController] AI indexing trigger failed: ${text}`);
          await DocumentModel.updateOne({ _id: doc._id }, { status: "failed" });
        } else {
          await DocumentModel.updateOne({ _id: doc._id }, { status: "processing" });
        }
      })
      .catch((err) => {
        console.error("[DocumentController] AI service network error:", err.message);
        // Do not block API response; update status in background
        void DocumentModel.updateOne({ _id: doc._id }, { status: "failed" });
      });

    return res.status(201).json({
      success: true,
      data: doc.toJSONView(),
    });
  } catch (error) {
    next(error);
  }
};

export const listDocuments = async (req, res, next) => {
  try {
    const { workspaceId } = req.query;
    if (!workspaceId) {
      throw new AppError("Workspace ID is required", 400);
    }
    const userId = req.user.id;

    const documents = await DocumentModel.find({ workspaceId, userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        documents: documents.map((doc) => doc.toJSONView()),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const doc = await DocumentModel.findOne({ _id: id, userId });
    if (!doc) {
      throw new AppError("Document not found", 404);
    }

    // Call Python AI Service to delete vector points from Qdrant
    fetch(`${env.pythonAiServiceUrl}/internal/v1/index/document/${doc._id}`, {
      method: "DELETE",
      headers: {
        "x-internal-token": env.internalServiceToken,
      },
    })
      .then((response) => {
        if (!response.ok) {
          console.error(`[DocumentController] Failed to delete chunks from Qdrant: ${doc._id}`);
        }
      })
      .catch((err) => {
        console.error("[DocumentController] AI service deletion network error:", err.message);
      });

    // Delete local file if it exists in local storage
    if (doc.url.includes("/uploads/documents/")) {
      const filename = path.basename(doc.url);
      const filePath = path.join(process.cwd(), "uploads", "documents", filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await DocumentModel.deleteOne({ _id: id });

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const updateDocumentStatus = async (req, res, next) => {
  try {
    const token = req.headers["x-internal-token"];
    if (token !== env.internalServiceToken) {
      throw new AppError("Unauthorized", 401);
    }

    const { id } = req.params;
    const { status, chunksIndexed } = req.body;

    const doc = await DocumentModel.findById(id);
    if (!doc) {
      throw new AppError("Document not found", 404);
    }

    if (status) doc.status = status;
    if (chunksIndexed !== undefined) doc.chunksIndexed = chunksIndexed;

    await doc.save();

    return res.status(200).json({
      success: true,
      data: doc.toJSONView(),
    });
  } catch (error) {
    next(error);
  }
};
