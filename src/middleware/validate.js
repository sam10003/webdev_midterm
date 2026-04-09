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
