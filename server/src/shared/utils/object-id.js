import mongoose from "mongoose";

export function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}
