import mongoose from "mongoose";

const workspaceSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: "",
      maxlength: 500,
    },
    icon: {
      type: String,
      default: "sparkles",
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

workspaceSchema.methods.toJSONView = function toJSONView() {
  return {
    id: this._id.toString(),
    ownerId: this.ownerId.toString(),
    name: this.name,
    description: this.description,
    icon: this.icon,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Workspace = mongoose.model("Workspace", workspaceSchema);
