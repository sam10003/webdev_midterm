import { z } from "zod";

const objectIdString = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid id");

const workerEntrySchema = z.object({
  name: z.string().min(1).transform((v) => v.trim()),
  hours: z.number(),
});

const materialNoteSchema = z.object({
  client: objectIdString,
  project: objectIdString,
  format: z.literal("material"),
  description: z.string().min(1).transform((v) => v.trim()),
  workDate: z.coerce.date(),
  material: z.string().min(1).transform((v) => v.trim()),
  quantity: z.number(),
  unit: z.string().min(1).transform((v) => v.trim()),
});

const hoursNoteSchema = z
  .object({
    client: objectIdString,
    project: objectIdString,
    format: z.literal("hours"),
    description: z.string().min(1).transform((v) => v.trim()),
    workDate: z.coerce.date(),
    hours: z.number().optional(),
    workers: z.array(workerEntrySchema).optional(),
  })
  .refine(
    (data) =>
      (data.hours != null && !Number.isNaN(data.hours)) ||
      (Array.isArray(data.workers) && data.workers.length > 0),
    {
      message: "Provide hours and/or at least one worker entry",
      path: ["hours"],
    }
  );

/** POST body — discriminated by `format`. */
export const createDeliveryNoteSchema = z.discriminatedUnion("format", [
  materialNoteSchema,
  hoursNoteSchema,
]);

/** PATCH .../sign */
export const signDeliveryNoteSchema = z.object({
  signatureData: z.string().min(1, "signatureData is required"),
});

/** GET /api/deliverynote list */
export const deliveryNoteListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  project: objectIdString.optional(),
  client: objectIdString.optional(),
  format: z.enum(["material", "hours"]).optional(),
  signed: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  from: z.preprocess(
    (q) => (q === "" || q === undefined ? undefined : q),
    z.coerce.date().optional()
  ),
  to: z.preprocess(
    (q) => (q === "" || q === undefined ? undefined : q),
    z.coerce.date().optional()
  ),
  sort: z.string().optional().default("workDate"),
});
