import { z } from "zod";
import { addressSchema } from "./schemas.js";

const optionalEmail = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  z.string().email().optional()
);

const optionalPhone = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  z.string().min(1).optional()
);

export const createClientSchema = z.object({
  name: z.string().min(1).transform((v) => v.trim()),
  cif: z.string().min(1).transform((v) => v.trim()),
  email: optionalEmail,
  phone: optionalPhone,
  address: addressSchema,
});

export const updateClientSchema = createClientSchema.partial();

/** GET /api/client and GET /api/client/archived */
export const clientListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  name: z.string().optional(),
  sort: z.string().optional().default("createdAt"),
});
