import mongoose from "mongoose";

const blockSchema = new mongoose.Schema(
  {
    blockId: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["heading", "paragraph", "code", "checklist", "quote", "image"],
      required: true,
    },
    content: {
      type: mongoose.Schema.Types.Mixed,
      default: "",
    },
    properties: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    position: {
      type: Number,
      required: true,
    },
  },
  { _id: false },
);

const pageSchema = new mongoose.Schema(
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
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Section",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    emoji: {
      type: String,
      default: "",
    },
    blocks: {
      type: [blockSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
    knowledgeStatus: {
      type: String,
      enum: ["not_indexed", "pending", "indexed", "failed"],
      default: "not_indexed",
      index: true,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

pageSchema.index({ sectionId: 1, updatedAt: -1 });
pageSchema.index({ workspaceId: 1, updatedAt: -1 });

pageSchema.methods.toJSONView = function toJSONView() {
  return {
    id: this._id.toString(),
    workspaceId: this.workspaceId.toString(),
    notebookId: this.notebookId.toString(),
    sectionId: this.sectionId.toString(),
    title: this.title,
    emoji: this.emoji,
    blocks: this.blocks,
    status: this.status,
    knowledgeStatus: this.knowledgeStatus,
    tags: this.tags || [],
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Page = mongoose.model("Page", pageSchema);
