function parseCloudinaryUrl(url) {
  if (!url) return { cloudName: "", apiKey: "", apiSecret: "" };
  try {
    const match = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
    if (match) {
      return {
        apiKey: match[1],
        apiSecret: match[2],
        cloudName: match[3],
      };
    }
  } catch (e) {
    // ignore parsing errors
  }
  return { cloudName: "", apiKey: "", apiSecret: "" };
}

const parsedCloudinary = parseCloudinaryUrl(process.env.CLOUDINARY_URL);

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173",
  mongoUri: process.env.MONGO_URI || "",
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || "dev-access-secret",
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || "dev-refresh-secret",
  accessTokenExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || parsedCloudinary.cloudName || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || parsedCloudinary.apiKey || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || parsedCloudinary.apiSecret || "",
};
