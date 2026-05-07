import request from "supertest";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Client from "../src/models/Client.js";
import Company from "../src/models/Company.js";
import bcrypt from "bcryptjs";
import { createVerifiedUserWithCompany } from "./helpers/seed.js";

const addr = () => ({
  street: "Gran Vía",
  number: "1",
  postal: "28013",
  city: "Madrid",
  province: "Madrid",
});

const clientPayload = (cif = "B12345678") => ({
  name: "Cliente SL",
  cif,
  email: "cliente@example.com",
  phone: "600000000",
  address: addr(),
});

describe("Clients API", () => {
  afterEach(async () => {
    await Client.deleteMany({});
    await Company.deleteMany({});
    await User.deleteMany({});
  });

  it("creates, lists, gets, updates, archives, lists archived, restores, hard-deletes", async () => {
    const { company, accessToken } = await createVerifiedUserWithCompany();

    const auth = { Authorization: `Bearer ${accessToken}` };

    const createRes = await request(app)
      .post("/api/client")
      .set(auth)
      .send(clientPayload())
      .expect(201);

    const id = createRes.body.client._id;
    expect(createRes.body.client.company).toBe(String(company._id));

    await request(app)
      .post("/api/client")
      .set(auth)
      .send(clientPayload())
      .expect(409);

    const listRes = await request(app)
      .get("/api/client?page=1&limit=10&sort=-createdAt")
      .set(auth)
      .expect(200);

    expect(listRes.body.totalItems).toBe(1);
    expect(listRes.body.totalPages).toBe(1);
    expect(listRes.body.currentPage).toBe(1);
    expect(listRes.body.data).toHaveLength(1);

    const byId = await request(app).get(`/api/client/${id}`).set(auth).expect(200);
    expect(byId.body.client.name).toBe("Cliente SL");

    await request(app)
      .put(`/api/client/${id}`)
      .set(auth)
      .send({ name: "Cliente Updated" })
      .expect(200);

    await request(app).delete(`/api/client/${id}?soft=true`).set(auth).expect(200);

    await request(app).get(`/api/client/${id}`).set(auth).expect(404);

    const archivedList = await request(app)
      .get("/api/client/archived")
      .set(auth)
      .expect(200);
    expect(archivedList.body.totalItems).toBe(1);

    await request(app).patch(`/api/client/${id}/restore`).set(auth).expect(200);

    await request(app).get(`/api/client/${id}`).set(auth).expect(200);

    await request(app).delete(`/api/client/${id}`).set(auth).expect(200);

    await request(app).get(`/api/client`).set(auth).expect(200);
    expect((await request(app).get("/api/client").set(auth)).body.totalItems).toBe(0);
  });

  it("returns 400 when user has no company", async () => {
    const password = await bcrypt.hash("password1234", 10);
    const user = await User.create({
      email: `solo-${Date.now()}@example.com`,
      password,
      status: "verified",
    });

    const jwtMod = await import("jsonwebtoken");
    const config = (await import("../src/config/index.js")).default;
    const token = jwtMod.default.sign(
      { _id: user._id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: "15m" }
    );

    await request(app)
      .post("/api/client")
      .set({ Authorization: `Bearer ${token}` })
      .send(clientPayload("B99999999"))
      .expect(400);
  });

  it("returns 400 for invalid client id", async () => {
    const { accessToken } = await createVerifiedUserWithCompany();
    await request(app)
      .get("/api/client/not-a-valid-id")
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(400);
  });

  it("returns 400 for invalid list query page", async () => {
    const { accessToken } = await createVerifiedUserWithCompany();
    await request(app)
      .get("/api/client?page=not-a-number")
      .set({ Authorization: `Bearer ${accessToken}` })
      .expect(400);
  });

  it("returns 403 when email not verified", async () => {
    const password = await bcrypt.hash("password1234", 10);
    const user = await User.create({
      email: `pend-${Date.now()}@example.com`,
      password,
      status: "pending",
    });
    const company = await Company.create({
      owner: user._id,
      name: "Co",
      cif: "X1",
    });
    user.company = company._id;
    await user.save();

    const jwtMod = await import("jsonwebtoken");
    const config = (await import("../src/config/index.js")).default;
    const token = jwtMod.default.sign(
      { _id: user._id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: "15m" }
    );

    await request(app)
      .post("/api/client")
      .set({ Authorization: `Bearer ${token}` })
      .send(clientPayload("B88888888"))
      .expect(403);
  });
});
