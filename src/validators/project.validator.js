import { z } from "zod";
import { addressSchema } from "./schemas.js";

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

const optionalEmail = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  z.string().email().optional()
);

export const createProjectSchema = z.object({
  client: objectIdString,
  name: z.string().min(1).transform((v) => v.trim()),
  projectCode: z.string().min(1).transform((v) => v.trim()),
  address: addressSchema,
  email: optionalEmail,
  notes: z.string().optional(),
  active: z.boolean().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

/** GET /api/project and GET /api/project/archived */
export const projectListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  client: objectIdString.optional(),
  name: z.string().optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  sort: z.string().optional().default("createdAt"),
});
