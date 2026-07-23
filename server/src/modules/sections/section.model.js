import mongoose from "mongoose";

const sectionSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    notebookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Notebook",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 140,
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

sectionSchema.index({ notebookId: 1, position: 1 });

sectionSchema.methods.toJSONView = function toJSONView() {
  return {
    id: this._id.toString(),
    workspaceId: this.workspaceId.toString(),
    notebookId: this.notebookId.toString(),
    title: this.title,
    position: this.position,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Section = mongoose.model("Section", sectionSchema);
