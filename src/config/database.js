import mongoose from "mongoose";

const CONNECTED = 1;

function isConnected() {
  return mongoose.connection.readyState === CONNECTED;
}

/**
 * Connect Mongoose to MongoDB (Atlas, local, or mongodb-memory-server in tests).
 * Safe to call again if already connected (no-op).
 *
 * @param {string} mongoUri
 * @param {import('mongoose').ConnectOptions} [options]
 */
export async function connectDb(mongoUri, options = {}) {
  if (!mongoUri) {
    throw new Error("MONGO_URI is required to connect to the database");
  }
  if (isConnected()) {
    return;
  }
  await mongoose.connect(mongoUri, options);
  console.log("Connected to MongoDB");
}

/**
 * Disconnect (tests, teardown). Safe if already disconnected.
 */
export async function disconnectDb() {
  if (mongoose.connection.readyState === 0) {
    return;
  }
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB");
}
