import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    bytes: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "indexed", "failed"],
      default: "pending",
    },
    chunksIndexed: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

documentSchema.methods.toJSONView = function toJSONView() {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    workspaceId: this.workspaceId.toString(),
    title: this.title,
    url: this.url,
    bytes: this.bytes,
    status: this.status,
    chunksIndexed: this.chunksIndexed,
    createdAt: this.createdAt,
  };
};

export const DocumentModel = mongoose.model("Document", documentSchema);
