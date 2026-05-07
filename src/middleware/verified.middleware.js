import { AppError } from "../utils/AppError.js";

/**
 * Use **after** `authMiddleware`. Blocks users whose email is not verified (`status !== 'verified'`).
 * Apply to business routes (clients, projects, delivery notes); keep register/login/validation exempt.
 */
export const requireVerified = (req, res, next) => {
  if (req.user?.status !== "verified") {
    return next(AppError.forbidden("Email verification required"));
  }
  next();
};
