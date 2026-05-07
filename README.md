# BildyApp API

REST API for BildyApp: authentication, companies, clients, projects, delivery notes (with PDFs), rate limiting, Swagger docs, Socket.IO realtime events, and optional Slack alerts for server errors.

## Requirements

- Node.js 20+
- MongoDB (local or Atlas URI)

## Install

```bash
npm install
```

## Environment

Copy the example file and fill in values:

```bash
cp .env.example .env
```

Required for a normal run:

- `MONGO_URI`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

Optional:

- `SMTP_*` / `MAIL_FROM` — verification email on register (omitted in Jest; see `tests/setup.js`)
- `SLACK_WEBHOOK_URL` — 5xx alerts (disabled when `NODE_ENV=test`)
- `CLIENT_URL` or `CORS_ORIGINS` — CORS and Socket.IO
- `PDF_STORAGE_DIR` — delivery note PDF storage (default `uploads/pdfs`)
- `SWAGGER_PATH` — API docs path (default `/api-docs`)

## Run

```bash
npm run dev
```

Server listens on `PORT` (default `3000`).

## API documentation (OpenAPI 3)

After starting the server, open:

**http://localhost:3000/api-docs**

(Or your host plus `SWAGGER_PATH` if you changed it.) Swagger UI is excluded from the global API rate limiter.

## Tests

Tests use **Jest**, **Supertest**, and **mongodb-memory-server** (in-memory MongoDB only; your Atlas URI from `.env` is not used when `NODE_ENV=test`).

```bash
npm test
npm run test:coverage
```

ESM is enabled with `NODE_OPTIONS=--experimental-vm-modules` (see `package.json` and `jest.config.js`). JWT secrets are set in `tests/setup.js` before the app loads if they are missing.

Slack and SMTP are cleared in the test setup so outbound email and webhooks are not triggered.

## HTTP examples

- **`requests.http`** — overview and curl-oriented examples (repo root).
- **`requests/`** — VS Code **REST Client** style files (`user.http`, `client.http`, `project.http`, `deliverynote.http`) using `{{baseUrl}}` and `{{token}}` variables.

## Socket.IO (optional)

Same port as HTTP. Connect with JWT either in `auth.token` or `Authorization: Bearer <accessToken>`. The server joins each socket to a room named by the user’s `companyId` and emits `client:new`, `project:new`, `deliverynote:new`, and `deliverynote:signed` after successful writes.

Example (Node client):

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:3000", {
  auth: { token: accessToken },
});
socket.on("deliverynote:signed", (payload) => console.log(payload));
```

## License

ISC
