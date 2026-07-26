import mongoose from "mongoose";

const assetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: false,
      index: true,
    },
    publicId: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    format: {
      type: String,
      default: "",
    },
    width: {
      type: Number,
      default: 0,
    },
    height: {
      type: Number,
      default: 0,
    },
    bytes: {
      type: Number,
      default: 0,
    },
    originalFilename: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

assetSchema.methods.toJSONView = function toJSONView() {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    workspaceId: this.workspaceId ? this.workspaceId.toString() : null,
    publicId: this.publicId,
    url: this.url,
    format: this.format,
    width: this.width,
    height: this.height,
    bytes: this.bytes,
    originalFilename: this.originalFilename,
    createdAt: this.createdAt,
  };
};

export const Asset = mongoose.model("Asset", assetSchema);
