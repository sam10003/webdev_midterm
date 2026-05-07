import { z } from "zod";

/** Shared address shape (clients & projects). */
export const addressSchema = z.object({
  street: z.string().min(1).transform((v) => v.trim()),
  number: z.string().min(1).transform((v) => v.trim()),
  postal: z.string().min(1).transform((v) => v.trim()),
  city: z.string().min(1).transform((v) => v.trim()),
  province: z.string().min(1).transform((v) => v.trim()),
});
