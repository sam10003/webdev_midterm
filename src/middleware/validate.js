import { AppError } from "../utils/AppError.js";

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join(", ");
    return next(AppError.badRequest(message));
  }
  req.body = result.data;
  next();
};

/** Validates `req.query` (e.g. pagination). Parsed output on `req.validatedQuery`. */
export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);
  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join(", ");
    return next(AppError.badRequest(message));
  }
  req.validatedQuery = result.data;
  next();
};
