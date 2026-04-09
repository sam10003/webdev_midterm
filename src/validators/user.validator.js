import { z } from "zod";

export const registerSchema = z.object({
  email: z
    .string()
    .email("Invalid email")
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});





export const validationSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Code must be exactly 6 digits"),
});

const addressSchema = z.object({
  street: z.string().min(1).transform((v) => v.trim()),
  number: z.string().min(1).transform((v) => v.trim()),
  postal: z.string().min(1).transform((v) => v.trim()),
  city: z.string().min(1).transform((v) => v.trim()),
  province: z.string().min(1).transform((v) => v.trim()),
});

export const onboardingPersonalSchema = z.object({
  name: z.string().min(1).transform((v) => v.trim()),
  lastName: z.string().min(1).transform((v) => v.trim()),
  nif: z.string().min(1).transform((v) => v.trim()),
  address: addressSchema,
});

// Bonus: discriminatedUnion — freelance needs no company fields
export const companySchema = z.discriminatedUnion("isFreelance", [
  z.object({
    isFreelance: z.literal(true),
  }),
  z.object({
    isFreelance: z.literal(false),
    name: z.string().min(1).transform((v) => v.trim()),
    cif: z.string().min(1).transform((v) => v.trim()),
    address: addressSchema,
  }),
]);

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

export const inviteSchema = z.object({
  email: z
    .string()
    .email("Invalid email")
    .transform((v) => v.toLowerCase().trim()),
  name: z.string().min(1).transform((v) => v.trim()),
  lastName: z.string().min(1).transform((v) => v.trim()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});