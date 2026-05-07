import http from "http";
import mongoose from "mongoose";
import app from "./app.js";
import config, { assertRequiredConfig } from "./config/index.js";
import { connectDb } from "./config/database.js";
import { attachSocketIO } from "./socket.js";

const start = async () => {
  assertRequiredConfig();
  await connectDb(config.mongoUri);

  if (config.appMode === "test" && config.wipeDbOnBoot) {
    await mongoose.connection.db.dropDatabase();
    console.log("Test mode: database cleared on boot");
  }

  const httpServer = http.createServer(app);

  attachSocketIO(httpServer, app);

  httpServer.listen(config.port, () => {
    console.log(`HTTP + WebSocket listening on port ${config.port}`);
    console.log(`Swagger UI: http://localhost:${config.port}${config.swagger.path}`);
  });
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
