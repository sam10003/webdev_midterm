import path from "path";
import { fileURLToPath } from "url";
import swaggerJsdoc from "swagger-jsdoc";
import config from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const apiGlobs = [
  path.join(__dirname, "../routes/*.js"),
  path.join(__dirname, "../controllers/*.js"),
];

/** Reusable JSON error body `{ error: string }` */
const errorJson = (description, exampleMessage) => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/ErrorMessage" },
      examples: {
        default: { value: { error: exampleMessage } },
      },
    },
  },
});

/**
 * OpenAPI 3.0 — JSDoc `@openapi` blocks in `src/routes/*.js` (and controllers) extend paths.
 * No global `security`; each operation declares `bearerAuth` or `security: []` for public routes.
 */
export function buildSwaggerSpec() {
  return swaggerJsdoc({
    definition: {
      openapi: "3.0.3",
      info: {
        title: "BildyApp API",
        version: "1.0.0",
        description:
          "REST API for BildyApp — users, companies, clients, projects, delivery notes, PDFs, and Socket.IO. " +
          "Authenticated routes expect `Authorization: Bearer <accessToken>`. " +
          "Rate limit: 100 requests / 15 min per IP (Swagger UI path is excluded).",
      },
      servers: [
        { url: `http://localhost:${config.port}`, description: "Local" },
      ],
      tags: [
        { name: "User", description: "Register, login, email verification, onboarding, profile" },
        { name: "Client", description: "Clients (company-scoped)" },
        { name: "Project", description: "Projects linked to clients" },
        { name: "DeliveryNote", description: "Delivery notes, PDF download, signing" },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Use `accessToken` from `POST /api/user/register` or `POST /api/user/login`.",
          },
        },
        responses: {
          BadRequest: errorJson("Validation or bad input", "Password must be at least 8 characters"),
          Unauthorized: errorJson("Missing or invalid JWT / credentials", "Invalid credentials"),
          Forbidden: errorJson("Not allowed for this user/role", "Email not verified"),
          NotFound: errorJson("Resource not found", "Client not found"),
          Conflict: errorJson("Duplicate unique field", "Email already in use"),
          TooManyRequests: errorJson("Too many attempts or rate limit", "No verification attempts remaining"),
          InternalError: errorJson("Unexpected server error", "Internal server error"),
        },
        schemas: {
          ErrorMessage: {
            type: "object",
            required: ["error"],
            properties: {
              error: { type: "string", description: "Human-readable message from AppError or handler" },
            },
          },
          ObjectId: {
            type: "string",
            pattern: "^[a-fA-F0-9]{24}$",
            example: "507f1f77bcf86cd799439011",
            description: "MongoDB ObjectId hex string",
          },
          Address: {
            type: "object",
            required: ["street", "number", "postal", "city", "province"],
            properties: {
              street: { type: "string" },
              number: { type: "string" },
              postal: { type: "string" },
              city: { type: "string" },
              province: { type: "string" },
            },
          },
          User: {
            type: "object",
            description: "User (password and refresh token are never returned)",
            properties: {
              _id: { $ref: "#/components/schemas/ObjectId" },
              email: { type: "string", format: "email" },
              name: { type: "string" },
              lastName: { type: "string" },
              nif: { type: "string" },
              role: { type: "string", enum: ["admin", "guest"] },
              status: { type: "string", enum: ["pending", "verified"] },
              company: {
                description: "ObjectId or populated Company on `GET /api/user`",
                oneOf: [{ $ref: "#/components/schemas/ObjectId" }, { $ref: "#/components/schemas/Company" }],
              },
              address: { $ref: "#/components/schemas/Address" },
              fullName: { type: "string", readOnly: true },
              deleted: { type: "boolean" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          UserSummary: {
            type: "object",
            properties: {
              email: { type: "string", format: "email" },
              status: { type: "string", enum: ["pending", "verified"] },
              role: { type: "string", enum: ["admin", "guest"] },
              name: { type: "string" },
              lastName: { type: "string" },
            },
          },
          TokenPair: {
            type: "object",
            required: ["accessToken", "refreshToken"],
            properties: {
              accessToken: { type: "string" },
              refreshToken: { type: "string" },
            },
          },
          RegisterRequest: {
            type: "object",
            required: ["email", "password"],
            properties: {
              email: { type: "string", format: "email" },
              password: { type: "string", minLength: 8, description: "Min 8 characters" },
            },
          },
          LoginRequest: {
            type: "object",
            required: ["email", "password"],
            properties: {
              email: { type: "string", format: "email" },
              password: { type: "string" },
            },
          },
          EmailValidationRequest: {
            type: "object",
            required: ["code"],
            properties: {
              code: { type: "string", pattern: "^\\d{6}$", example: "123456" },
            },
          },
          OnboardingPersonalRequest: {
            type: "object",
            required: ["name", "lastName", "nif", "address"],
            properties: {
              name: { type: "string" },
              lastName: { type: "string" },
              nif: { type: "string" },
              address: { $ref: "#/components/schemas/Address" },
            },
          },
          CompanyOnboardingFreelance: {
            type: "object",
            required: ["isFreelance"],
            properties: {
              isFreelance: { type: "boolean", enum: [true] },
            },
          },
          CompanyOnboardingBusiness: {
            type: "object",
            required: ["isFreelance", "name", "cif", "address"],
            properties: {
              isFreelance: { type: "boolean", enum: [false] },
              name: { type: "string" },
              cif: { type: "string" },
              address: { $ref: "#/components/schemas/Address" },
            },
          },
          ChangePasswordRequest: {
            type: "object",
            required: ["currentPassword", "newPassword"],
            properties: {
              currentPassword: { type: "string" },
              newPassword: { type: "string", minLength: 8 },
            },
          },
          RefreshRequest: {
            type: "object",
            required: ["refreshToken"],
            properties: {
              refreshToken: { type: "string" },
            },
          },
          InviteRequest: {
            type: "object",
            required: ["email", "name", "lastName", "password"],
            properties: {
              email: { type: "string", format: "email" },
              name: { type: "string" },
              lastName: { type: "string" },
              password: { type: "string", minLength: 8 },
            },
          },
          Company: {
            type: "object",
            properties: {
              _id: { $ref: "#/components/schemas/ObjectId" },
              owner: { $ref: "#/components/schemas/ObjectId" },
              name: { type: "string" },
              cif: { type: "string" },
              address: { $ref: "#/components/schemas/Address" },
              logo: { type: "string", format: "uri", description: "Public URL to uploaded logo" },
              isFreelance: { type: "boolean" },
              deleted: { type: "boolean" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          Client: {
            type: "object",
            properties: {
              _id: { $ref: "#/components/schemas/ObjectId" },
              user: { $ref: "#/components/schemas/ObjectId" },
              company: { $ref: "#/components/schemas/ObjectId" },
              name: { type: "string" },
              cif: { type: "string" },
              email: { type: "string", format: "email" },
              phone: { type: "string" },
              address: { $ref: "#/components/schemas/Address" },
              deleted: { type: "boolean", default: false },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          ClientCreate: {
            type: "object",
            required: ["name", "cif", "address"],
            properties: {
              name: { type: "string" },
              cif: { type: "string" },
              email: { type: "string", format: "email" },
              phone: { type: "string" },
              address: { $ref: "#/components/schemas/Address" },
            },
          },
          ClientUpdate: {
            type: "object",
            description: "All fields optional (partial update)",
            properties: {
              name: { type: "string" },
              cif: { type: "string" },
              email: { type: "string", format: "email" },
              phone: { type: "string" },
              address: { $ref: "#/components/schemas/Address" },
            },
          },
          Project: {
            type: "object",
            properties: {
              _id: { $ref: "#/components/schemas/ObjectId" },
              user: { $ref: "#/components/schemas/ObjectId" },
              company: { $ref: "#/components/schemas/ObjectId" },
              client: { $ref: "#/components/schemas/ObjectId" },
              name: { type: "string" },
              projectCode: { type: "string" },
              address: { $ref: "#/components/schemas/Address" },
              email: { type: "string", format: "email" },
              notes: { type: "string" },
              active: { type: "boolean" },
              deleted: { type: "boolean" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          ProjectCreate: {
            type: "object",
            required: ["client", "name", "projectCode", "address"],
            properties: {
              client: { $ref: "#/components/schemas/ObjectId" },
              name: { type: "string" },
              projectCode: { type: "string" },
              address: { $ref: "#/components/schemas/Address" },
              email: { type: "string", format: "email" },
              notes: { type: "string" },
              active: { type: "boolean" },
            },
          },
          ProjectUpdate: {
            type: "object",
            description: "All fields optional",
            properties: {
              client: { $ref: "#/components/schemas/ObjectId" },
              name: { type: "string" },
              projectCode: { type: "string" },
              address: { $ref: "#/components/schemas/Address" },
              email: { type: "string", format: "email" },
              notes: { type: "string" },
              active: { type: "boolean" },
            },
          },
          DeliveryNoteWorker: {
            type: "object",
            required: ["name", "hours"],
            properties: {
              name: { type: "string" },
              hours: { type: "number" },
            },
          },
          DeliveryNote: {
            type: "object",
            properties: {
              _id: { $ref: "#/components/schemas/ObjectId" },
              user: { $ref: "#/components/schemas/ObjectId" },
              company: { $ref: "#/components/schemas/ObjectId" },
              client: { $ref: "#/components/schemas/ObjectId" },
              project: { $ref: "#/components/schemas/ObjectId" },
              format: { type: "string", enum: ["material", "hours"] },
              description: { type: "string" },
              workDate: { type: "string", format: "date-time" },
              material: { type: "string" },
              quantity: { type: "number" },
              unit: { type: "string" },
              hours: { type: "number" },
              workers: { type: "array", items: { $ref: "#/components/schemas/DeliveryNoteWorker" } },
              signed: { type: "boolean" },
              signedAt: { type: "string", format: "date-time" },
              signatureData: { type: "string", description: "Base64 image data after signing" },
              pdfPath: { type: "string", description: "Relative path under PDF storage dir" },
              deleted: { type: "boolean" },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
          DeliveryNoteCreateMaterial: {
            type: "object",
            required: ["client", "project", "format", "description", "workDate", "material", "quantity", "unit"],
            properties: {
              client: { $ref: "#/components/schemas/ObjectId" },
              project: { $ref: "#/components/schemas/ObjectId" },
              format: { type: "string", enum: ["material"] },
              description: { type: "string" },
              workDate: { type: "string", format: "date-time" },
              material: { type: "string" },
              quantity: { type: "number" },
              unit: { type: "string" },
            },
          },
          DeliveryNoteCreateHours: {
            type: "object",
            required: ["client", "project", "format", "description", "workDate"],
            properties: {
              client: { $ref: "#/components/schemas/ObjectId" },
              project: { $ref: "#/components/schemas/ObjectId" },
              format: { type: "string", enum: ["hours"] },
              description: { type: "string" },
              workDate: { type: "string", format: "date-time" },
              hours: { type: "number" },
              workers: { type: "array", items: { $ref: "#/components/schemas/DeliveryNoteWorker" } },
            },
            description: "Provide `hours` and/or at least one `workers` entry.",
          },
          DeliveryNoteCreate: {
            description: "Discriminate on `format`: `material` vs `hours` (see oneOf members).",
            oneOf: [
              { $ref: "#/components/schemas/DeliveryNoteCreateMaterial" },
              { $ref: "#/components/schemas/DeliveryNoteCreateHours" },
            ],
          },
          SignDeliveryNoteRequest: {
            type: "object",
            required: ["signatureData"],
            properties: {
              signatureData: { type: "string", description: "Base64-encoded signature image" },
            },
          },
          PaginatedClients: {
            type: "object",
            properties: {
              data: { type: "array", items: { $ref: "#/components/schemas/Client" } },
              currentPage: { type: "integer" },
              totalItems: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
          PaginatedProjects: {
            type: "object",
            properties: {
              data: { type: "array", items: { $ref: "#/components/schemas/Project" } },
              currentPage: { type: "integer" },
              totalItems: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
          PaginatedDeliveryNotes: {
            type: "object",
            properties: {
              data: { type: "array", items: { $ref: "#/components/schemas/DeliveryNote" } },
              currentPage: { type: "integer" },
              totalItems: { type: "integer" },
              totalPages: { type: "integer" },
            },
          },
        },
      },
    },
    apis: apiGlobs,
  });
}
