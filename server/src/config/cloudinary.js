import { v2 as cloudinary } from "cloudinary";
import { env } from "./env.js";

if (env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret) {
  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });
  console.log("Cloudinary configured");
} else {
  console.warn("Cloudinary environment variables not set. Cloudinary upload will use local fallback.");
}

export { cloudinary };
