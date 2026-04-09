import { Router } from "express";
import * as userCtrl from "../controllers/user.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { authorize } from "../middleware/role.middleware.js";
import { validate } from "../middleware/validate.js";
import { upload } from "../middleware/upload.js";
import {
  registerSchema,
  loginSchema,
  validationSchema,
  onboardingPersonalSchema,
  companySchema,
  passwordSchema,
  inviteSchema,
  refreshSchema,
} from "../validators/user.validator.js";

const router = Router();

router.post("/register", validate(registerSchema), userCtrl.register);
router.post("/login", validate(loginSchema), userCtrl.login);

router.put("/validation", authMiddleware, validate(validationSchema), userCtrl.validateEmail);
router.put("/register", authMiddleware, validate(onboardingPersonalSchema), userCtrl.onboardingPersonal);
router.patch("/company", authMiddleware, validate(companySchema), userCtrl.onboardingCompany);
router.patch("/logo", authMiddleware, upload.single("logo"), userCtrl.uploadLogo);

router.get("/", authMiddleware, userCtrl.getUser);
router.delete("/", authMiddleware, userCtrl.deleteUser);
router.put("/password", authMiddleware, validate(passwordSchema), userCtrl.changePassword);

router.post("/refresh", validate(refreshSchema), userCtrl.refreshToken);
router.post("/logout", authMiddleware, userCtrl.logout);

router.post("/invite", authMiddleware, authorize("admin"), validate(inviteSchema), userCtrl.invite);

export default router;
