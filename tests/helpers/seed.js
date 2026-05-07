import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../../src/models/User.js";
import Company from "../../src/models/Company.js";
import config from "../../src/config/index.js";

const SALT = 10;

export async function createVerifiedUserWithCompany(overrides = {}) {
  const suffix = Date.now();
  const password = await bcrypt.hash(overrides.passwordPlain ?? "password1234", SALT);

  const user = await User.create({
    email: overrides.email ?? `user-${suffix}@example.com`,
    password,
    status: "verified",
    role: overrides.role ?? "admin",
    ...overrides.userFields,
  });

  const company = await Company.create({
    owner: user._id,
    name: overrides.companyName ?? "Seed Company",
    cif: overrides.companyCif ?? `CIF-${suffix}`,
    ...overrides.companyFields,
  });

  user.company = company._id;
  await user.save();

  const accessToken = jwt.sign(
    { _id: user._id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: "15m" }
  );

  return { user, company, accessToken };
}
