import { AppError } from "../utils/AppError.js";
import { notifySlackServerError } from "../services/logger.service.js";

export const errorHandler = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err?.code === 11000) {
    const keys = err.keyPattern ? Object.keys(err.keyPattern) : [];
    let message = "Duplicate entry";
    if (keys.includes("email")) {
      message = "Email already in use";
    } else if (
      keys.includes("cif") ||
      keys.includes("projectCode") ||
      keys.includes("company")
    ) {
      message =
        "A record with this unique field already exists for your company";
    }
    return res.status(409).json({ error: message });
  }

  if (err.name === "MulterError") {
    return res.status(400).json({ error: err.message });
  }

  if (err.message === "Only image files are allowed") {
    return res.status(400).json({ error: err.message });
  }

  console.error(err);

  void notifySlackServerError(err, req).catch((e) => {
    console.error("notifySlackServerError:", e);
  });

  res.status(500).json({ error: "Internal server error" });
};
