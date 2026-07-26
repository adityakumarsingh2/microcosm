import { AppError } from "../../shared/errors/app-error.js";
import { cloudinary } from "../../config/cloudinary.js";
import { env } from "../../config/env.js";
import { Asset } from "./uploads.model.js";

export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError("Image file is required", 400);
    }

    const { workspaceId } = req.body;
    const userId = req.user.id;

    let uploadResult;

    const isCloudinaryConfigured =
      env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret;

    if (isCloudinaryConfigured) {
      uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "microcosm",
            resource_type: "image",
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              return reject(new AppError("Failed to upload image to cloud storage", 502));
            }
            resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });
    } else {
      // Graceful local dev fallback when Cloudinary is not configured
      const base64Data = req.file.buffer.toString("base64");
      const mimeType = req.file.mimetype || "image/png";
      const format = mimeType.split("/")[1] || "png";
      
      uploadResult = {
        public_id: `local_dev_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        secure_url: `data:${mimeType};base64,${base64Data}`,
        format: format,
        width: 800,
        height: 600,
        bytes: req.file.size || req.file.buffer.length,
      };
    }

    const asset = await Asset.create({
      userId,
      workspaceId: workspaceId || null,
      publicId: uploadResult.public_id,
      url: uploadResult.secure_url || uploadResult.url,
      format: uploadResult.format || "",
      width: uploadResult.width || 0,
      height: uploadResult.height || 0,
      bytes: uploadResult.bytes || 0,
      originalFilename: req.file.originalname || "image",
    });

    return res.status(201).json({
      success: true,
      data: asset.toJSONView(),
    });
  } catch (error) {
    next(error);
  }
};

export const getUploadSignature = async (req, res, next) => {
  try {
    const isCloudinaryConfigured =
      env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret;

    if (!isCloudinaryConfigured) {
      throw new AppError("Cloudinary is not configured on the server", 503);
    }

    const timestamp = Math.round(new Date().getTime() / 1000);
    const paramsToSign = {
      timestamp,
      folder: "microcosm",
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, env.cloudinaryApiSecret);

    return res.status(200).json({
      success: true,
      data: {
        timestamp,
        signature,
        cloudName: env.cloudinaryCloudName,
        apiKey: env.cloudinaryApiKey,
        folder: "microcosm",
      },
    });
  } catch (error) {
    next(error);
  }
};
