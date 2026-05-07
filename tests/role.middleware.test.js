import { describe, it, expect, jest } from "@jest/globals";
import { authorize } from "../src/middleware/role.middleware.js";
import { AppError } from "../src/utils/AppError.js";

describe("authorize middleware", () => {
  it("calls next when role matches", () => {
    const next = jest.fn();
    authorize("admin")({ user: { role: "admin" } }, {}, next);
    expect(next).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("calls next with forbidden when role does not match", () => {
    const next = jest.fn();
    authorize("admin")({ user: { role: "guest" } }, {}, next);
    expect(next.mock.calls[0][0]).toBeInstanceOf(AppError);
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });
});
