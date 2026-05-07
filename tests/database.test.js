import mongoose from "mongoose";

describe("database connection (mongodb-memory-server)", () => {
  it("is connected after global setup", () => {
    expect(mongoose.connection.readyState).toBe(1);
  });

  it("uses an in-memory URI", () => {
    expect(process.env.MONGO_URI).toMatch(/^mongodb:\/\/127\.0\.0\.1:\d+\//);
  });
});
