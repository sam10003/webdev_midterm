# Final Project: Delivery Notes Digitalization — BildyApp

## Description

Build the complete backend for **BildyApp**, a REST API with Node.js and Express that manages delivery notes (time or materials records) between clients and suppliers.

This project **builds on the intermediate assignment** (user module already implemented) and adds the core business logic: client, project, and delivery note management, along with professional documentation, automated testing, and real-time notifications.

This project evaluates knowledge from **topics T8 to T10** of the course.

---

## Required Technologies

| Category | Technology | Topic |
|----------|------------|-------|
| Documentation | Swagger/OpenAPI 3.0 (`swagger-ui-express`, `swagger-jsdoc`) | T8 |
| Testing | Jest + Supertest + `mongodb-memory-server` | T8 |
| Monitoring | Slack Incoming Webhooks for 5XX errors | T8 |
| Real-time | Socket.IO (WebSockets) | T10 |
| PDF Generation | pdfkit (or similar library) | — |

---

## Onboarding (completed in the intermediate assignment)

The following user module endpoints are assumed to be already implemented and working:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/user/register` | User registration |
| PUT | `/api/user/validation` | Email validation with code |
| POST | `/api/user/login` | Login (returns JWT token) |
| PUT | `/api/user/register` | Update personal details |
| PATCH | `/api/user/company` | Create/update company (separate Company model) |
| PATCH | `/api/user/logo` | Upload company logo |
| GET | `/api/user` | Get authenticated user |
| DELETE | `/api/user` | Delete user (hard/soft) |

> **Note:** On account creation or login, a JWT token is returned and must be sent in the `Authorization: Bearer <token>` header on all protected requests.

If any endpoint was not completed in the intermediate assignment, it may be completed now, but **it will not earn additional points** in this project.

---

## Data Models

### Entity Relationships

```
┌──────────┐         ┌──────────┐
│ Company  │◄──owner──│   User   │
│          │──1:N────►│          │
└──────────┘         └──────────┘
     │                     │
     ├──1:N──► Client      │
     ├──1:N──► Project     │
     └──1:N──► DeliveryNote◄──1:N──┘
                    │
              Project──1:N──► DeliveryNote
              Client──1:N──► Project
```

> The **Company** and **User** models were defined in the intermediate assignment. Below are the new models that reference both.

### Client

```javascript
{
  user: ObjectId,          // ref: 'User' — user who created it
  company: ObjectId,       // ref: 'Company' — company it belongs to
  name: String,            // Client name
  cif: String,             // Tax ID
  email: String,
  phone: String,
  address: {
    street: String,
    number: String,
    postal: String,
    city: String,
    province: String
  },
  deleted: Boolean,        // Soft delete
  createdAt: Date,
  updatedAt: Date
}
```

### Project

```javascript
{
  user: ObjectId,          // ref: 'User' — user who created it
  company: ObjectId,       // ref: 'Company' — company it belongs to
  client: ObjectId,        // ref: 'Client' — associated client
  name: String,            // Project name
  projectCode: String,     // Unique internal code
  address: {
    street: String,
    number: String,
    postal: String,
    city: String,
    province: String
  },
  email: String,           // Project contact email
  notes: String,           // Additional notes
  active: Boolean,
  deleted: Boolean,        // Soft delete
  createdAt: Date,
  updatedAt: Date
}
```

### DeliveryNote

```javascript
{
  user: ObjectId,          // ref: 'User' — user who creates it
  company: ObjectId,       // ref: 'Company' — company it belongs to
  client: ObjectId,        // ref: 'Client'
  project: ObjectId,       // ref: 'Project'
  format: 'material' | 'hours',  // Note type
  description: String,
  workDate: Date,          // Work date
  // For format: 'material'
  material: String,
  quantity: Number,
  unit: String,
  // For format: 'hours'
  hours: Number,
  workers: [{              // Multiple workers (optional)
    name: String,
    hours: Number
  }],
  // Signature
  signed: Boolean,
  signedAt: Date,
  signatureData: String,   // Base64 signature image (stored in DB)
  pdfPath: String,         // Local/relative path of the generated PDF
  deleted: Boolean,        // Soft delete
  createdAt: Date,
  updatedAt: Date
}
```

> **Note:** All models include `company` as a reference. This allows any user from the same company to access shared resources (clients, projects, delivery notes), not just the user who created them.

---

## Endpoints to Implement

### Clients (1 point)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/client` | Create a client |
| PUT | `/api/client/:id` | Update a client |
| GET | `/api/client` | List all clients |
| GET | `/api/client/:id` | Get a specific client |
| DELETE | `/api/client/:id` | Archive (soft) or delete (hard) |
| GET | `/api/client/archived` | List archived clients |
| PATCH | `/api/client/:id/restore` | Restore an archived client |

Technical specifications:
- **Create**: associate with the user and their `company` (from the JWT token). Validate with Zod (name, tax ID, email, address). Ensure no client with the same tax ID already exists within the company.
- **List** (`GET /api/client`): show clients from the user's company. Implement **pagination** and **filters**:
  - Pagination: `?page=1&limit=10` (also return `totalPages`, `totalItems`, `currentPage`).
  - Filters: `?name=García` (partial search), `?sort=createdAt` (sorting).
- **Get**: return a specific client belonging to the company.
- **Delete**: use the query parameter `?soft=true` to choose deletion type.
- **Archive/Restore**: list soft-deleted clients and allow recovery.

### Projects (1.5 points)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/project` | Create a project |
| PUT | `/api/project/:id` | Update a project |
| GET | `/api/project` | List all projects |
| GET | `/api/project/:id` | Get a specific project |
| DELETE | `/api/project/:id` | Archive (soft) or delete (hard) |
| GET | `/api/project/archived` | List archived projects |
| PATCH | `/api/project/:id/restore` | Restore an archived project |

Technical specifications:
- **Create**: associate with the user, their `company`, and an existing client from the same company. Validate with Zod (name, project code, address, client, etc.). Ensure no project with the same code already exists within the company.
- **List** (`GET /api/project`): show projects from the user's company. Implement **pagination** and **filters**:
  - Pagination: `?page=1&limit=10` (also return `totalPages`, `totalItems`, `currentPage`).
  - Filters: `?client=<clientId>`, `?name=Renovation`, `?active=true`, `?sort=-createdAt`.
- **Delete**: use query parameter `?soft=true` to choose deletion type.

### Delivery Notes (2 points)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/deliverynote` | Create a delivery note |
| GET | `/api/deliverynote` | List delivery notes |
| GET | `/api/deliverynote/:id` | Get a specific delivery note |
| GET | `/api/deliverynote/pdf/:id` | Download delivery note as PDF |
| PATCH | `/api/deliverynote/:id/sign` | Sign a delivery note |
| DELETE | `/api/deliverynote/:id` | Delete a delivery note |

Technical specifications:

- **Create** (`POST /api/deliverynote`):
  - The note belongs to a specific project.
  - Can be of type `material` (delivered materials) or `hours` (hours worked).
  - Can be simple (single entry) or contain multiple workers/hours and materials.

- **List** (`GET /api/deliverynote`): implement **pagination** and **filters**:
  - Pagination: `?page=1&limit=10` (also return `totalPages`, `totalItems`, `currentPage`).
  - Filters: `?project=<projectId>`, `?client=<clientId>`, `?format=hours`, `?signed=true`, `?from=2025-01-01&to=2025-12-31`, `?sort=-workDate`.

- **Get** (`GET /api/deliverynote/:id`):
  - Use `populate` in Mongoose to include user, client, and project data alongside the delivery note.

- **Download PDF** (`GET /api/deliverynote/pdf/:id`):
  - Generate the delivery note as a PDF using **pdfkit** (or similar).
  - The PDF must include user, client, project, and delivery note data (hours or materials), plus the signature if signed.
  - Only the note's owner or a `guest` of their company may download it.
  - Return the PDF as a stream (`res.setHeader('Content-Type', 'application/pdf')`).

- **Sign** (`PATCH /api/deliverynote/:id/sign`):
  - Receives the signature image as a Base64 string in the request body (JSON).
  - Stores the signature data in the database (`signatureData` field).
  - Once signed, generates the PDF locally.
  - A signed delivery note cannot be modified or deleted.

- **Delete** (`DELETE /api/deliverynote/:id`):
  - Can only be deleted if the delivery note **is not signed**.

---

## Requirements by Topic

### Swagger Documentation (T8) — 1.5 points

- Document **all** API endpoints using Swagger/OpenAPI 3.0 annotations.
- The interactive Swagger UI must be accessible at `/api-docs`.
- Define schemas (`components/schemas`) for all entities: User, Company, Client, Project, DeliveryNote.
- Include request and response examples.
- Document possible error codes for each endpoint.

### Jest Testing (T8) — 2 points

- Write integration tests using **Jest + Supertest** for all endpoints.
- Use **`mongodb-memory-server`** to run tests against an in-memory database.
- Achieve a minimum coverage of **70%**.
- Configure scripts in `package.json`:
  ```json
  {
    "test": "cross-env NODE_ENV=test node --experimental-vm-modules node_modules/jest/bin/jest.js --forceExit --detectOpenHandles",
    "test:watch": "npm test -- --watch",
    "test:coverage": "npm test -- --coverage"
  }
  ```

### Real-time Notifications with WebSockets (T10) — 1 point

- Implement **Socket.IO** to emit real-time events:
  - `deliverynote:new` — when a new delivery note is created.
  - `deliverynote:signed` — when a delivery note is signed.
  - `client:new` — when a new client is created.
  - `project:new` — when a new project is created.
- Events must only be emitted to users of the **same company** (use Socket.IO rooms with `company._id` as the room name).
- The WebSocket connection must require **JWT authentication**.

### Email Sending (T8) — 0.5 points

- Send the verification code by email on registration.
- You may use **Nodemailer** with a service like Gmail, SendGrid, or Mailtrap.

### Slack Logging (T8) — 0.5 points

- The application sends all **5XX** HTTP errors to a Slack channel via an Incoming Webhook.
- Include in the message: timestamp, route, HTTP method, error message, and stack trace.

---

## General Technical Requirements

1. Create all necessary **Mongoose models** with their schemas and validations. Remember that Company is a separate model with `owner` (ref to User), and that Client, Project, and DeliveryNote reference both `user` and `company`.
2. Create all requested **routes**.
3. Create all necessary **Zod validators**.
4. Create all **controllers** following the MVC pattern.
5. All endpoints except register, login, and password recovery require a **JWT token**.
6. Implement **4XX client error** handling using the `AppError` class.
7. Include **Helmet**, **rate limiting**, and input **sanitization**.
8. Make **progressive commits** throughout development (do not push all code at once).
9. Include an **`.env.example`** file with all used environment variables.
10. Include **`.http`** example files for each endpoint.

---

## Expected Project Structure

```
bildyapp-api/
├── src/
│   ├── config/
│   │   ├── index.js            # Centralized configuration
│   │   ├── database.js         # MongoDB connection
│   │   └── swagger.js          # Swagger/OpenAPI configuration
│   ├── controllers/
│   │   ├── user.controller.js
│   │   ├── client.controller.js
│   │   ├── project.controller.js
│   │   └── deliverynote.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js   # JWT verification
│   │   ├── error-handler.js    # Centralized error middleware
│   │   ├── rate-limit.js       # Rate limiting
│   │   ├── sanitize.js         # NoSQL sanitization
│   │   └── validate.js         # Zod validation middleware
│   ├── models/
│   │   ├── User.js
│   │   ├── Company.js
│   │   ├── Client.js
│   │   ├── Project.js
│   │   └── DeliveryNote.js
│   ├── routes/
│   │   ├── index.js
│   │   ├── user.routes.js
│   │   ├── client.routes.js
│   │   ├── project.routes.js
│   │   └── deliverynote.routes.js
│   ├── services/
│   │   ├── logger.service.js   # Logger with Slack
│   │   ├── mail.service.js     # Email sending
│   │   └── pdf.service.js      # PDF generation
│   ├── utils/
│   │   └── AppError.js
│   ├── validators/
│   │   ├── user.validator.js
│   │   ├── client.validator.js
│   │   ├── project.validator.js
│   │   └── deliverynote.validator.js
│   ├── app.js                  # Express + Socket.IO configuration
│   └── index.js                # Entry point
├── tests/
│   ├── setup.js                # mongodb-memory-server setup
│   ├── auth.test.js
│   ├── client.test.js
│   ├── project.test.js
│   └── deliverynote.test.js
├── .env
├── .env.example
├── .gitignore
├── jest.config.js
├── package.json
└── README.md
```

---

## Submission

- **GitHub repository** with the source code.
- Include **`.env.example`** with all used environment variables (no real values).
- Include **`.http`** files or a Postman collection with examples for each endpoint.
- Include a **`README.md`** with:
  - Installation and setup instructions.
  - Link to Swagger documentation (if deployed).
  - Instructions to run the tests (`npm test`).
- Make **progressive commits** throughout development.

---

## Rubric (10 points + bonus)

### Base Score (10 points)

| Feature | Topic | Points |
|---------|-------|--------|
| Clients (CRUD + pagination/filters + archive/restore) | T5, T6 | 1 point |
| Projects (CRUD + pagination/filters + archive/restore) | T5, T6 | 1.5 points |
| Delivery Notes (CRUD + pagination/filters + PDF generation + signing) | T5 | 2 points |
| Swagger documentation (all endpoints) | T8 | 1.5 points |
| Jest testing (coverage ≥ 70%) | T8 | 2 points |
| Real-time WebSockets (Socket.IO) | T10 | 1 point |
| Email sending | T8 | 0.5 points |
| Slack logging | T8 | 0.5 points |

### Bonus (extra points)

| Feature | Topic | Extra Points |
|---------|-------|-------------|
| Migration to TypeScript (total or partial) | T12 | +1 point |
| PostgreSQL + Prisma version (alternative or complementary to MongoDB) | T9 | +1 point |
| Dashboard with aggregation pipeline | T5 | +0.5 points |

---

> General technical requirements will also be evaluated (MVC, Zod, AppError, security, JWT, progressive commits). Failure to meet them may result in a **grade penalty**.

