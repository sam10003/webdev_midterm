import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Company from "../models/Company.js";
import config from "../config/index.js";
import { AppError } from "../utils/AppError.js";
import notifier from "../services/notification.service.js";
import { sendVerificationCode } from "../services/mail.service.js";

const SALT_ROUNDS = 10;

const generateTokens = (user) => {
  const payload = { _id: user._id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiry,
  });
  const refreshToken = jwt.sign(payload, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshExpiry,
  });
  return { accessToken, refreshToken };
};

const randomCode = () =>
  String(Math.floor(100000 + Math.random() * 900000));

/** Console fallback when SMTP is missing or send fails (development or LOG_VERIFICATION_CODE). */
function logVerificationCodeIfDebug(email, code, mailResult) {
  const dev = config.nodeEnv === "development";
  const explicit = config.logVerificationCode;
  if (!dev && !explicit) return;
  if (mailResult?.ok) {
    if (explicit) {
      console.log(`[mail] Verification code for ${email}: ${code}`);
    }
    return;
  }
  const why = mailResult?.reason || "unknown";
  console.warn(
    `[mail] Verification email not sent (${why}). Code for ${email}: ${code}`
  );
}

// ── 1) Register ──────────────────────────────────────────────
export const register = async (req, res) => {
  const { email, password } = req.body;

  const existing = await User.findOne({ email, deleted: false });
  if (existing) throw AppError.conflict("Email already in use");

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const code = randomCode();

  const user = await User.create({
    email,
    password: hashed,
    verificationCode: code,
    verificationAttempts: 3,
  });

  const mailResult = await sendVerificationCode({ to: email, code });
  logVerificationCodeIfDebug(email, code, mailResult);

  const { accessToken, refreshToken } = generateTokens(user);
  user.refreshToken = refreshToken;
  await user.save();

  notifier.emit("user:registered", user);

  res.status(201).json({
    user: { email: user.email, status: user.status, role: user.role },
    accessToken,
    refreshToken,
  });
};

// ── 2) Email validation ──────────────────────────────────────
export const validateEmail = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw AppError.notFound("User not found");

  if (user.verificationAttempts <= 0) {
    throw AppError.tooMany("No verification attempts remaining");
  }

  if (req.body.code !== user.verificationCode) {
    user.verificationAttempts -= 1;
    await user.save();

    if (user.verificationAttempts <= 0) {
      throw AppError.tooMany("No verification attempts remaining");
    }
    throw AppError.badRequest("Invalid verification code");
  }

  user.status = "verified";
  user.verificationCode = undefined;
  user.verificationAttempts = undefined;
  await user.save();

  notifier.emit("user:verified", user);

  res.json({ message: "Email verified successfully" });
};

// ── 3) Login ─────────────────────────────────────────────────
export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, deleted: false });
  if (!user) throw AppError.unauthorized("Invalid credentials");

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw AppError.unauthorized("Invalid credentials");

  const { accessToken, refreshToken } = generateTokens(user);
  user.refreshToken = refreshToken;
  await user.save();

  res.json({
    user: {
      email: user.email,
      status: user.status,
      role: user.role,
      name: user.name,
      lastName: user.lastName,
    },
    accessToken,
    refreshToken,
  });
};

// ── 4a) Onboarding — personal data ──────────────────────────
export const onboardingPersonal = async (req, res) => {
  const { name, lastName, nif, address } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, lastName, nif, address },
    { new: true }
  );
  if (!user) throw AppError.notFound("User not found");

  res.json({
    user: {
      email: user.email,
      name: user.name,
      lastName: user.lastName,
      fullName: user.fullName,
      nif: user.nif,
      address: user.address,
    },
  });
};

// ── 4b) Onboarding — company ────────────────────────────────
export const onboardingCompany = async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw AppError.notFound("User not found");

  let companyData;

  if (req.body.isFreelance) {
    if (!user.nif) {
      throw AppError.badRequest(
        "Complete personal onboarding first (NIF required for freelance)"
      );
    }
    companyData = {
      name: [user.name, user.lastName].filter(Boolean).join(" "),
      cif: user.nif,
      address: user.address || {},
      isFreelance: true,
    };
  } else {
    companyData = {
      name: req.body.name,
      cif: req.body.cif,
      address: req.body.address,
      isFreelance: false,
    };
  }

  const existingCompany = await Company.findOne({
    cif: companyData.cif,
    deleted: false,
  });

  if (existingCompany) {
    user.company = existingCompany._id;
    user.role = "guest";
    await user.save();

    return res.json({
      message: "Joined existing company",
      company: existingCompany,
      role: user.role,
    });
  }

  const company = await Company.create({ ...companyData, owner: user._id });
  user.company = company._id;
  user.role = "admin";
  await user.save();

  res.status(201).json({
    message: "Company created",
    company,
    role: user.role,
  });
};

// ── 5) Logo upload ───────────────────────────────────────────
export const uploadLogo = async (req, res) => {
  if (!req.file) throw AppError.badRequest("No file uploaded");

  const user = await User.findById(req.user._id);
  if (!user?.company) {
    throw AppError.badRequest("User has no company assigned");
  }

  const logoUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  const company = await Company.findByIdAndUpdate(
    user.company,
    { logo: logoUrl },
    { new: true }
  );

  res.json({ logo: company.logo });
};

// ── 6) Get user ──────────────────────────────────────────────
export const getUser = async (req, res) => {
  const user = await User.findById(req.user._id)
    .select("-password -refreshToken -verificationCode")
    .populate("company");

  if (!user) throw AppError.notFound("User not found");

  res.json({ user });
};

// ── 7a) Refresh token ────────────────────────────────────────
export const refreshToken = async (req, res) => {
  const { refreshToken: token } = req.body;

  let payload;
  try {
    payload = jwt.verify(token, config.jwtRefreshSecret);
  } catch {
    throw AppError.unauthorized("Invalid or expired refresh token");
  }

  const user = await User.findById(payload._id);
  if (!user || user.deleted || user.refreshToken !== token) {
    throw AppError.unauthorized("Invalid refresh token");
  }

  const { accessToken, refreshToken: newRefresh } = generateTokens(user);
  user.refreshToken = newRefresh;
  await user.save();

  res.json({ accessToken, refreshToken: newRefresh });
};

// ── 7b) Logout ───────────────────────────────────────────────
export const logout = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  res.json({ message: "Logged out successfully" });
};

// ── 8) Delete user ───────────────────────────────────────────
export const deleteUser = async (req, res) => {
  const soft = req.query.soft === "true";

  const user = soft
    ? await User.findByIdAndUpdate(req.user._id, { deleted: true }, { new: true })
    : await User.findByIdAndDelete(req.user._id);

  if (!user) throw AppError.notFound("User not found");

  notifier.emit("user:deleted", user);

  res.json({ message: soft ? "User soft-deleted" : "User permanently deleted" });
};

// ── 9) Change password ───────────────────────────────────────
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id);
  if (!user) throw AppError.notFound("User not found");

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw AppError.unauthorized("Current password is incorrect");

  user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await user.save();

  res.json({ message: "Password updated successfully" });
};

// ── 10) Invite ───────────────────────────────────────────────
export const invite = async (req, res) => {
  const { email, name, lastName, password } = req.body;

  const inviter = await User.findById(req.user._id);
  if (!inviter?.company) {
    throw AppError.badRequest("You must belong to a company to invite users");
  }

  const existing = await User.findOne({ email, deleted: false });
  if (existing) throw AppError.conflict("Email already in use");

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const code = randomCode();

  const user = await User.create({
    email,
    password: hashed,
    name,
    lastName,
    company: inviter.company,
    role: "guest",
    verificationCode: code,
    verificationAttempts: 3,
  });

  notifier.emit("user:invited", user);

  res.status(201).json({
    user: {
      email: user.email,
      name: user.name,
      lastName: user.lastName,
      role: user.role,
      company: user.company,
    },
  });
};
