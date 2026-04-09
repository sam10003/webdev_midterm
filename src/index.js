import mongoose from "mongoose";
import app from "./app.js";
import config from "./config/index.js";

const start = async () => {
  await mongoose.connect(config.mongoUri);
  console.log("Connected to MongoDB");

  if (config.appMode === "test" && config.wipeDbOnBoot) {
    await mongoose.connection.db.dropDatabase();
    console.log("Test mode: database cleared on boot");
  }

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
};

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
