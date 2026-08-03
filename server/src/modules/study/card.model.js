import mongoose from "mongoose";

const cardSchema = new mongoose.Schema(
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
    pageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Page",
      required: true,
      index: true,
    },
    front: {
      type: String,
      required: true,
    },
    back: {
      type: String,
      required: true,
    },
    nextReviewDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    interval: {
      type: Number,
      default: 0, // In days
    },
    repetitions: {
      type: Number,
      default: 0,
    },
    easeFactor: {
      type: Number,
      default: 2.5,
    },
  },
  { timestamps: true }
);

cardSchema.methods.toJSONView = function toJSONView() {
  return {
    id: this._id.toString(),
    userId: this.userId.toString(),
    workspaceId: this.workspaceId.toString(),
    pageId: this.pageId.toString(),
    front: this.front,
    back: this.back,
    nextReviewDate: this.nextReviewDate,
    interval: this.interval,
    repetitions: this.repetitions,
    easeFactor: this.easeFactor,
    createdAt: this.createdAt,
  };
};

export const Card = mongoose.model("Card", cardSchema);
