import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { sanitize } from "./middleware/sanitize.js";
import { apiLimiter } from "./middleware/rate-limit.js";
import userRoutes from "./routes/user.routes.js";
import clientRoutes from "./routes/client.routes.js";
import projectRoutes from "./routes/project.routes.js";
import deliveryNoteRoutes from "./routes/deliverynote.routes.js";
import { errorHandler } from "./middleware/error-handler.js";
import config from "./config/index.js";
import { buildSwaggerSpec } from "./config/swagger.js";

const app = express();

const swaggerSpec = buildSwaggerSpec();
app.use(
  config.swagger.path,
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, { explorer: true })
);

app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(sanitize);

app.use(apiLimiter);

app.use("/uploads", express.static("uploads"));

app.use("/api/user", userRoutes);
app.use("/api/client", clientRoutes);
app.use("/api/project", projectRoutes);
app.use("/api/deliverynote", deliveryNoteRoutes);

app.use("/", (req,res) => {
  res.send("Hello World");
});

app.use(errorHandler);

export default app;
