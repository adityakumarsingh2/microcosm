import mongoose from "mongoose";

const notebookSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    position: {
      type: Number,
      default: 1000,
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

notebookSchema.index({ workspaceId: 1, position: 1 });

notebookSchema.methods.toJSONView = function toJSONView() {
  return {
    id: this._id.toString(),
    workspaceId: this.workspaceId.toString(),
    ownerId: this.ownerId.toString(),
    title: this.title,
    description: this.description,
    position: this.position,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Notebook = mongoose.model("Notebook", notebookSchema);
