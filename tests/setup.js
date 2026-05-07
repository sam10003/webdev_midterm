import { MongoMemoryServer } from "mongodb-memory-server";
import { connectDb, disconnectDb } from "../src/config/database.js";

/** Must run before any test file imports `src/config` (JWT used at module load). */
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "jest-jwt-secret-min-32-chars-long!!";
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = "jest-refresh-secret-min-32-chars!!";
}

/** Disable outbound integrations during tests (Slack / SMTP). Mail service no-ops without SMTP_HOST. */
process.env.SLACK_WEBHOOK_URL = "";
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASS = "";
process.env.LOG_VERIFICATION_CODE = "false";

/** In-memory replica; stopped in afterAll — never touches Atlas / production. */
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();

  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  process.env.NODE_ENV = "test";

  await connectDb(uri);
});

afterAll(async () => {
  await disconnectDb();
  if (mongoServer) {
    await mongoServer.stop();
  }
});
