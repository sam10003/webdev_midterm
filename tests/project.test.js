import request from "supertest";
import mongoose from "mongoose";
import app from "../src/app.js";
import Client from "../src/models/Client.js";
import Company from "../src/models/Company.js";
import Project from "../src/models/Project.js";
import User from "../src/models/User.js";
import { createVerifiedUserWithCompany } from "./helpers/seed.js";

const addr = () => ({
  street: "Gran Vía",
  number: "1",
  postal: "28013",
  city: "Madrid",
  province: "Madrid",
});

const projectPayload = (clientId, code = "PRJ-001") => ({
  client: String(clientId),
  name: "Reforma local",
  projectCode: code,
  address: addr(),
  email: "obra@example.com",
  notes: "Obra mayor",
  active: true,
});

describe("Projects API", () => {
  afterEach(async () => {
    await Project.deleteMany({});
    await Client.deleteMany({});
    await Company.deleteMany({});
    await User.deleteMany({});
  });

  it("creates when client belongs to company; rejects duplicate code and foreign client", async () => {
    const { company, accessToken, user } = await createVerifiedUserWithCompany();
    const auth = { Authorization: `Bearer ${accessToken}` };

    const client = await Client.create({
      user: user._id,
      company: company._id,
      name: "Cliente",
      cif: "B11111111",
      address: addr(),
    });

    const res = await request(app)
      .post("/api/project")
      .set(auth)
      .send(projectPayload(client._id))
      .expect(201);

    const id = res.body.project._id;
    expect(res.body.project.company).toBe(String(company._id));
    expect(res.body.project.client).toBe(String(client._id));

    await request(app)
      .post("/api/project")
      .set(auth)
      .send(projectPayload(client._id, "PRJ-001"))
      .expect(409);

    await request(app)
      .post("/api/project")
      .set(auth)
      .send(projectPayload(new mongoose.Types.ObjectId(), "PRJ-002"))
      .expect(400);

    const otherUser = await createVerifiedUserWithCompany();
    const otherClient = await Client.create({
      user: otherUser.user._id,
      company: otherUser.company._id,
      name: "Otro",
      cif: "B22222222",
      address: addr(),
    });

    await request(app)
      .post("/api/project")
      .set(auth)
      .send(projectPayload(otherClient._id, "PRJ-099"))
      .expect(400);

    await request(app).delete(`/api/project/${id}`).set(auth).expect(200);
  });

  it("lists with filters and archive / restore / hard delete", async () => {
    const { company, accessToken, user } = await createVerifiedUserWithCompany();
    const auth = { Authorization: `Bearer ${accessToken}` };

    const client = await Client.create({
      user: user._id,
      company: company._id,
      name: "Cliente",
      cif: "B33333333",
      address: addr(),
    });

    const created = await request(app)
      .post("/api/project")
      .set(auth)
      .send(projectPayload(client._id, "PRJ-FLT"))
      .expect(201);

    const id = created.body.project._id;

    const list = await request(app)
      .get(
        `/api/project?page=1&limit=10&client=${client._id}&name=Reforma&active=true&sort=-createdAt`
      )
      .set(auth)
      .expect(200);

    expect(list.body.totalItems).toBe(1);
    expect(list.body.data[0].projectCode).toBe("PRJ-FLT");

    await request(app).put(`/api/project/${id}`).set(auth).send({ active: false }).expect(200);

    const inactive = await request(app)
      .get(`/api/project?active=false`)
      .set(auth)
      .expect(200);
    expect(inactive.body.totalItems).toBe(1);

    await request(app).delete(`/api/project/${id}?soft=true`).set(auth).expect(200);

    const archived = await request(app).get("/api/project/archived").set(auth).expect(200);
    expect(archived.body.totalItems).toBe(1);

    await request(app).patch(`/api/project/${id}/restore`).set(auth).expect(200);

    await request(app).get(`/api/project/${id}`).set(auth).expect(200);

    await request(app).delete(`/api/project/${id}`).set(auth).expect(200);

    expect((await request(app).get("/api/project").set(auth)).body.totalItems).toBe(0);
  });
});
