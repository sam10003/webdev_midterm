import mongoose from "mongoose";
import { AppError } from "./AppError.js";

export function assertObjectId(id, label = "id") {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw AppError.badRequest(`Invalid ${label}`);
  }
}
