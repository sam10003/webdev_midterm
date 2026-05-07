import { describe, it, expect, jest } from "@jest/globals";
import { errorHandler } from "../src/middleware/error-handler.js";
import { AppError } from "../src/utils/AppError.js";

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("errorHandler", () => {
  it("returns AppError status and message", () => {
    const res = mockRes();
    const err = AppError.notFound("Missing");
    errorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing" });
  });

  it("maps duplicate key on email to 409", () => {
    const res = mockRes();
    errorHandler({ code: 11000, keyPattern: { email: 1 } }, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: "Email already in use" });
  });

  it("maps duplicate key on cif to 409 company message", () => {
    const res = mockRes();
    errorHandler({ code: 11000, keyPattern: { cif: 1, company: 1 } }, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: "A record with this unique field already exists for your company",
    });
  });

  it("handles MulterError as 400", () => {
    const res = mockRes();
    const err = new Error("limit");
    err.name = "MulterError";
    err.message = "File too large";
    errorHandler(err, {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "File too large" });
  });

  it("handles non-image upload message as 400", () => {
    const res = mockRes();
    errorHandler(new Error("Only image files are allowed"), {}, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Only image files are allowed" });
  });

  it("returns 500 for unknown errors", () => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const res = mockRes();
    errorHandler(new Error("boom"), { method: "GET", originalUrl: "/x" }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
    console.error.mockRestore();
  });
});
