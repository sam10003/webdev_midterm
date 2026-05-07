import request from "supertest";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Company from "../src/models/Company.js";
import Client from "../src/models/Client.js";
import Project from "../src/models/Project.js";
import DeliveryNote from "../src/models/DeliveryNote.js";
import { createVerifiedUserWithCompany } from "./helpers/seed.js";

const addr = () => ({
  street: "Calle Mayor",
  number: "10",
  postal: "28001",
  city: "Madrid",
  province: "Madrid",
});

async function wipeAll() {
  await DeliveryNote.deleteMany({});
  await Project.deleteMany({});
  await Client.deleteMany({});
  await Company.deleteMany({});
  await User.deleteMany({});
}

describe("User API (register, login, tokens, onboarding, profile)", () => {
  afterEach(wipeAll);

  it("GET / returns hello", async () => {
    const res = await request(app).get("/").expect(200);
    expect(res.text).toMatch(/Hello/i);
  });

  it("register returns 201 with tokens and pending user", async () => {
    const email = `new-${Date.now()}@example.com`;
    const res = await request(app)
      .post("/api/user/register")
      .send({ email, password: "password123" })
      .expect(201);

    expect(res.body.user.status).toBe("pending");
    expect(res.body.accessToken).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();

    const u = await User.findOne({ email });
    expect(u?.verificationCode).toMatch(/^\d{6}$/);
  });

  it("register duplicate email returns 409", async () => {
    const email = `dup-${Date.now()}@example.com`;
    await request(app)
      .post("/api/user/register")
      .send({ email, password: "password123" })
      .expect(201);
    await request(app)
      .post("/api/user/register")
      .send({ email, password: "password123" })
      .expect(409);
  });

  it("login fails with 401 for wrong password", async () => {
    const email = `login-${Date.now()}@example.com`;
    await request(app)
      .post("/api/user/register")
      .send({ email, password: "password123" })
      .expect(201);
    await request(app)
      .post("/api/user/login")
      .send({ email, password: "wrongpassword" })
      .expect(401);
  });

  it("register, validate email, login, get user", async () => {
    const email = `flow-${Date.now()}@example.com`;
    const reg = await request(app)
      .post("/api/user/register")
      .send({ email, password: "password123" })
      .expect(201);

    const u = await User.findOne({ email });
    const code = u.verificationCode;

    await request(app)
      .put("/api/user/validation")
      .set({ Authorization: `Bearer ${reg.body.accessToken}` })
      .send({ code: "000000" })
      .expect(400);

    await request(app)
      .put("/api/user/validation")
      .set({ Authorization: `Bearer ${reg.body.accessToken}` })
      .send({ code })
      .expect(200);

    const loginRes = await request(app)
      .post("/api/user/login")
      .send({ email, password: "password123" })
      .expect(200);
    expect(loginRes.body.user.status).toBe("verified");

    const me = await request(app)
      .get("/api/user")
      .set({ Authorization: `Bearer ${loginRes.body.accessToken}` })
      .expect(200);
    expect(me.body.user.email).toBe(email);
  });

  it("refresh and logout", async () => {
    const email = `tok-${Date.now()}@example.com`;
    const reg = await request(app)
      .post("/api/user/register")
      .send({ email, password: "password123" })
      .expect(201);

    const u = await User.findOne({ email });
    await request(app)
      .put("/api/user/validation")
      .set({ Authorization: `Bearer ${reg.body.accessToken}` })
      .send({ code: u.verificationCode })
      .expect(200);

    const refresh1 = await request(app)
      .post("/api/user/refresh")
      .send({ refreshToken: reg.body.refreshToken })
      .expect(200);
    expect(refresh1.body.accessToken).toBeDefined();

    await request(app)
      .post("/api/user/refresh")
      .send({ refreshToken: "invalid" })
      .expect(401);

    await request(app)
      .post("/api/user/logout")
      .set({ Authorization: `Bearer ${refresh1.body.accessToken}` })
      .expect(200);

    await request(app)
      .post("/api/user/refresh")
      .send({ refreshToken: reg.body.refreshToken })
      .expect(401);
  });

  it("GET /api/user without token returns 401", async () => {
    await request(app).get("/api/user").expect(401);
  });

  it("GET /api/user with invalid JWT returns 401", async () => {
    await request(app)
      .get("/api/user")
      .set({ Authorization: "Bearer not-a-real-jwt" })
      .expect(401);
  });

  it("onboarding personal then freelance company", async () => {
    const email = `onb-${Date.now()}@example.com`;
    const reg = await request(app)
      .post("/api/user/register")
      .send({ email, password: "password123" })
      .expect(201);
    const u = await User.findOne({ email });
    await request(app)
      .put("/api/user/validation")
      .set({ Authorization: `Bearer ${reg.body.accessToken}` })
      .send({ code: u.verificationCode })
      .expect(200);

    const token = (await request(app).post("/api/user/login").send({ email, password: "password123" })).body
      .accessToken;
    const auth = { Authorization: `Bearer ${token}` };

    await request(app)
      .put("/api/user/register")
      .set(auth)
      .send({
        name: "Ana",
        lastName: "García",
        nif: "99999999R",
        address: addr(),
      })
      .expect(200);

    const co = await request(app).patch("/api/user/company").set(auth).send({ isFreelance: true }).expect(201);
    expect(co.body.company.isFreelance).toBe(true);
    expect(co.body.role).toBe("admin");
  });

  it("onboarding creates new company when CIF is new", async () => {
    const email = `biz-${Date.now()}@example.com`;
    const reg = await request(app)
      .post("/api/user/register")
      .send({ email, password: "password123" })
      .expect(201);
    const u = await User.findOne({ email });
    await request(app)
      .put("/api/user/validation")
      .set({ Authorization: `Bearer ${reg.body.accessToken}` })
      .send({ code: u.verificationCode })
      .expect(200);

    const login = await request(app)
      .post("/api/user/login")
      .send({ email, password: "password123" })
      .expect(200);
    const auth = { Authorization: `Bearer ${login.body.accessToken}` };

    await request(app)
      .put("/api/user/register")
      .set(auth)
      .send({
        name: "Bea",
        lastName: "Ruiz",
        nif: "88888888L",
        address: addr(),
      })
      .expect(200);

    const suffix = Date.now();
    const res = await request(app)
      .patch("/api/user/company")
      .set(auth)
      .send({
        isFreelance: false,
        name: "Acme SL",
        cif: `B${suffix}`.slice(0, 10),
        address: addr(),
      })
      .expect(201);
    expect(res.body.role).toBe("admin");
    expect(res.body.company.cif).toBeDefined();
  });

  it("second user joins existing company by CIF as guest", async () => {
    const suffix = Date.now();
    const cif = `B9${suffix}`.slice(0, 10);

    const { accessToken: t1 } = await createVerifiedUserWithCompany({
      companyCif: cif,
      email: `owner-${suffix}@example.com`,
    });

    const email2 = `joiner-${suffix}@example.com`;
    const reg2 = await request(app)
      .post("/api/user/register")
      .send({ email: email2, password: "password123" })
      .expect(201);
    const u2 = await User.findOne({ email: email2 });
    await request(app)
      .put("/api/user/validation")
      .set({ Authorization: `Bearer ${reg2.body.accessToken}` })
      .send({ code: u2.verificationCode })
      .expect(200);

    const login2 = await request(app)
      .post("/api/user/login")
      .send({ email: email2, password: "password123" })
      .expect(200);
    const auth2 = { Authorization: `Bearer ${login2.body.accessToken}` };

    await request(app)
      .put("/api/user/register")
      .set(auth2)
      .send({
        name: "Carlos",
        lastName: "Díaz",
        nif: "77777777K",
        address: addr(),
      })
      .expect(200);

    const join = await request(app)
      .patch("/api/user/company")
      .set(auth2)
      .send({
        isFreelance: false,
        name: "Ignored Name",
        cif,
        address: addr(),
      })
      .expect(200);

    expect(join.body.role).toBe("guest");
    expect(join.body.message).toMatch(/Joined/);
  });

  it("change password", async () => {
    const email = `pwd-${Date.now()}@example.com`;
    const reg = await request(app)
      .post("/api/user/register")
      .send({ email, password: "password123" })
      .expect(201);
    const u = await User.findOne({ email });
    await request(app)
      .put("/api/user/validation")
      .set({ Authorization: `Bearer ${reg.body.accessToken}` })
      .send({ code: u.verificationCode })
      .expect(200);

    const login = await request(app)
      .post("/api/user/login")
      .send({ email, password: "password123" })
      .expect(200);
    const auth = { Authorization: `Bearer ${login.body.accessToken}` };

    await request(app)
      .put("/api/user/password")
      .set(auth)
      .send({ currentPassword: "wrong", newPassword: "newpassword456" })
      .expect(401);

    await request(app)
      .put("/api/user/password")
      .set(auth)
      .send({ currentPassword: "password123", newPassword: "newpassword456" })
      .expect(200);

    await request(app)
      .post("/api/user/login")
      .send({ email, password: "newpassword456" })
      .expect(200);
  });

  it("soft delete user blocks further auth", async () => {
    const email = `del-${Date.now()}@example.com`;
    const reg = await request(app)
      .post("/api/user/register")
      .send({ email, password: "password123" })
      .expect(201);
    const u = await User.findOne({ email });
    await request(app)
      .put("/api/user/validation")
      .set({ Authorization: `Bearer ${reg.body.accessToken}` })
      .send({ code: u.verificationCode })
      .expect(200);

    await request(app)
      .delete("/api/user?soft=true")
      .set({ Authorization: `Bearer ${reg.body.accessToken}` })
      .expect(200);

    await request(app)
      .get("/api/user")
      .set({ Authorization: `Bearer ${reg.body.accessToken}` })
      .expect(401);
  });

  it("invite requires company (400) and admin (403 for guest)", async () => {
    const email = `invbase-${Date.now()}@example.com`;
    const reg = await request(app)
      .post("/api/user/register")
      .send({ email, password: "password123" })
      .expect(201);
    const u = await User.findOne({ email });
    await request(app)
      .put("/api/user/validation")
      .set({ Authorization: `Bearer ${reg.body.accessToken}` })
      .send({ code: u.verificationCode })
      .expect(200);

    await request(app)
      .post("/api/user/invite")
      .set({ Authorization: `Bearer ${reg.body.accessToken}` })
      .send({
        email: `nobody-${Date.now()}@example.com`,
        name: "X",
        lastName: "Y",
        password: "password123",
      })
      .expect(400);
  });

  it("admin can invite guest", async () => {
    const { accessToken } = await createVerifiedUserWithCompany();
    const auth = { Authorization: `Bearer ${accessToken}` };

    const res = await request(app)
      .post("/api/user/invite")
      .set(auth)
      .send({
        email: `colleague-${Date.now()}@example.com`,
        name: "María",
        lastName: "López",
        password: "password123",
      })
      .expect(201);
    expect(res.body.user.role).toBe("guest");
  });

  it("guest cannot invite (403)", async () => {
    const suffix = Date.now();
    const cif = `B8${suffix}`.slice(0, 10);
    await createVerifiedUserWithCompany({ companyCif: cif, email: `adm-${suffix}@example.com` });

    const email2 = `gst-${suffix}@example.com`;
    const reg2 = await request(app)
      .post("/api/user/register")
      .send({ email: email2, password: "password123" })
      .expect(201);
    const u2 = await User.findOne({ email: email2 });
    await request(app)
      .put("/api/user/validation")
      .set({ Authorization: `Bearer ${reg2.body.accessToken}` })
      .send({ code: u2.verificationCode })
      .expect(200);
    const login2 = await request(app)
      .post("/api/user/login")
      .send({ email: email2, password: "password123" })
      .expect(200);
    await request(app)
      .put("/api/user/register")
      .set({ Authorization: `Bearer ${login2.body.accessToken}` })
      .send({
        name: "G",
        lastName: "U",
        nif: "66666666J",
        address: addr(),
      })
      .expect(200);
    await request(app)
      .patch("/api/user/company")
      .set({ Authorization: `Bearer ${login2.body.accessToken}` })
      .send({ isFreelance: false, name: "X", cif, address: addr() })
      .expect(200);

    await request(app)
      .post("/api/user/invite")
      .set({ Authorization: `Bearer ${login2.body.accessToken}` })
      .send({
        email: `x-${suffix}@example.com`,
        name: "A",
        lastName: "B",
        password: "password123",
      })
      .expect(403);
  });
});
