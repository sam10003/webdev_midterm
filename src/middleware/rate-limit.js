import rateLimit from "express-rate-limit";
import config from "../config/index.js";

/**
 * Global API rate limit (brute-force / abuse). Swagger UI is excluded so local docs stay usable.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const p = req.path || "";
    const docsPath = config.swagger.path || "/api-docs";
    return p === docsPath || p.startsWith(`${docsPath}/`);
  },
});
