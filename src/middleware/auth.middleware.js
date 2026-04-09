import jwt from "jsonwebtoken";
import config from "../config/index.js";
import { AppError } from "../utils/AppError.js";

export const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(AppError.unauthorized("Token not provided"));
  }

  try {
    const token = header.split(" ")[1];
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch {
    next(AppError.unauthorized("Invalid or expired token"));
  }
};
