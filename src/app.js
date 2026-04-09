import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit"; //to avoid brute force attacks
import { sanitize } from "./middleware/sanitize.js"; //to avoid SQL injection
import userRoutes from "./routes/user.routes.js";
import { errorHandler } from "./middleware/error-handler.js";

const app = express();

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(sanitize);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

app.use("/uploads", express.static("uploads"));

app.use("/api/user", userRoutes);

app.use("/", (req,res) => {
  res.send("Hello World");
});

app.use(errorHandler);

export default app;
