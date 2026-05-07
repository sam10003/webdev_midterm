import { requireVerified } from "../src/middleware/verified.middleware.js";
import { AppError } from "../src/utils/AppError.js";

describe("requireVerified middleware", () => {
  it("calls next() when user is verified", () => {
    let passedArg;
    const next = (err) => {
      passedArg = err;
    };
    requireVerified({ user: { status: "verified" } }, {}, next);
    expect(passedArg).toBeUndefined();
  });

  it("calls next(err) with forbidden when status is pending", () => {
    let errArg;
    const next = (err) => {
      errArg = err;
    };
    requireVerified({ user: { status: "pending" } }, {}, next);
    expect(errArg).toBeInstanceOf(AppError);
    expect(errArg.statusCode).toBe(403);
  });

  it("calls next(err) when user missing", () => {
    let errArg;
    const next = (err) => {
      errArg = err;
    };
    requireVerified({}, {}, next);
    expect(errArg).toBeInstanceOf(AppError);
  });
});
