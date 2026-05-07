import jwt from "jsonwebtoken";
import User from "../models/User.js";
import config from "../config/index.js";
import { AppError } from "../utils/AppError.js";

/**
 * Verifies the access JWT, then loads the user from the DB so `req.user.role`
 * (and email) always match current state — JWT payload alone can be stale after
 * onboarding or other role changes.
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return next(AppError.unauthorized("Token not provided"));
    }

    const token = header.split(" ")[1];
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      return next(AppError.unauthorized("Invalid or expired token"));
    }

    const user = await User.findById(payload._id).select(
      "email role deleted status company"
    );
    if (!user || user.deleted) {
      return next(AppError.unauthorized("Invalid or expired token"));
    }

    req.user = {
      _id: user._id,
      email: user.email,
      role: user.role,
      status: user.status,
      company: user.company,
    };
    next();
  } catch (err) {
    next(err);
  }
};
