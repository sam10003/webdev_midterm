import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import User from "../src/models/User.js";
import Client from "../src/models/Client.js";
import Company from "../src/models/Company.js";
import Project from "../src/models/Project.js";
import DeliveryNote from "../src/models/DeliveryNote.js";
import config from "../src/config/index.js";
import { createVerifiedUserWithCompany } from "./helpers/seed.js";

const addr = () => ({
  street: "Gran Vía",
  number: "1",
  postal: "28013",
  city: "Madrid",
  province: "Madrid",
});

/** 1×1 transparent PNG */
const minimalPngSignature =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("Delivery notes API", () => {
  afterEach(async () => {
    await DeliveryNote.deleteMany({});
    await Project.deleteMany({});
    await Client.deleteMany({});
    await Company.deleteMany({});
    await User.deleteMany({});
  });

  it("creates, lists, gets populated; PDF auth; sign blocks delete", async () => {
    const { user: owner, company, accessToken } = await createVerifiedUserWithCompany();
    const authOwner = { Authorization: `Bearer ${accessToken}` };

    const client = await Client.create({
      user: owner._id,
      company: company._id,
      name: "Cliente DN",
      cif: "B88888111",
      address: addr(),
    });

    const project = await Project.create({
      user: owner._id,
      company: company._id,
      client: client._id,
      name: "Obra DN",
      projectCode: "DN-PRJ-1",
      address: addr(),
      active: true,
    });

    const body = {
      client: String(client._id),
      project: String(project._id),
      format: "material",
      description: "Entrega de cemento",
      workDate: new Date().toISOString(),
      material: "Cemento",
      quantity: 12,
      unit: "sacos",
    };

    const created = await request(app)
      .post("/api/deliverynote")
      .set(authOwner)
      .send(body)
      .expect(201);

    const id = created.body.deliveryNote._id;

    await request(app)
      .post("/api/deliverynote")
      .set(authOwner)
      .send({
        ...body,
        client: String(client._id),
        project: String(project._id),
        material: "Arena",
      })
      .expect(201);

    const list = await request(app)
      .get(`/api/deliverynote?format=material&client=${client._id}&project=${project._id}`)
      .set(authOwner)
      .expect(200);
    expect(list.body.totalItems).toBe(2);

    const one = await request(app).get(`/api/deliverynote/${id}`).set(authOwner).expect(200);
    expect(one.body.deliveryNote.client).toMatchObject({ name: "Cliente DN" });
    expect(one.body.deliveryNote.project).toMatchObject({ projectCode: "DN-PRJ-1" });
    expect(one.body.deliveryNote.user.email).toBeDefined();

    const otherAdminPassword = await bcrypt.hash("password1234", 10);
    const otherAdmin = await User.create({
      email: `admin2-${Date.now()}@example.com`,
      password: otherAdminPassword,
      status: "verified",
      role: "admin",
      company: company._id,
    });
    const otherAdminToken = jwt.sign(
      {
        _id: otherAdmin._id,
        email: otherAdmin.email,
        role: otherAdmin.role,
      },
      config.jwtSecret,
      { expiresIn: "15m" }
    );

    await request(app)
      .get(`/api/deliverynote/pdf/${id}`)
      .set({ Authorization: `Bearer ${otherAdminToken}` })
      .expect(403);

    await request(app)
      .get(`/api/deliverynote/pdf/${id}`)
      .set(authOwner)
      .expect(200)
      .expect("Content-Type", /pdf/);

    const guestPassword = await bcrypt.hash("password1234", 10);
    const guest = await User.create({
      email: `guest-${Date.now()}@example.com`,
      password: guestPassword,
      status: "verified",
      role: "guest",
      company: company._id,
    });
    const guestToken = jwt.sign(
      { _id: guest._id, email: guest.email, role: guest.role },
      config.jwtSecret,
      { expiresIn: "15m" }
    );
    const authGuest = { Authorization: `Bearer ${guestToken}` };

    await request(app)
      .get(`/api/deliverynote/pdf/${id}`)
      .set(authGuest)
      .expect(200)
      .expect("Content-Type", /pdf/);

    await request(app)
      .patch(`/api/deliverynote/${id}/sign`)
      .set(authOwner)
      .send({ signatureData: minimalPngSignature })
      .expect(200);

    await request(app).delete(`/api/deliverynote/${id}`).set(authOwner).expect(400);

    await request(app).get(`/api/deliverynote/pdf/${id}`).set(authGuest).expect(200);
  });

  it("rejects mismatched client/project", async () => {
    const { user: owner, company, accessToken } = await createVerifiedUserWithCompany();
    const auth = { Authorization: `Bearer ${accessToken}` };

    const other = await createVerifiedUserWithCompany();

    const myClient = await Client.create({
      user: owner._id,
      company: company._id,
      name: "Mine",
      cif: "B77777111",
      address: addr(),
    });

    const foreignProject = await Project.create({
      user: other.user._id,
      company: other.company._id,
      client: (
        await Client.create({
          user: other.user._id,
          company: other.company._id,
          name: "F",
          cif: "B66666111",
          address: addr(),
        })
      )._id,
      name: "Foreign",
      projectCode: "FX-1",
      address: addr(),
    });

    await request(app)
      .post("/api/deliverynote")
      .set(auth)
      .send({
        client: String(myClient._id),
        project: String(foreignProject._id),
        format: "hours",
        description: "Work",
        workDate: new Date().toISOString(),
        hours: 3,
      })
      .expect(400);
  });

  it("creates hours-format note with workers only (no top-level hours)", async () => {
    const { user: owner, company, accessToken } = await createVerifiedUserWithCompany();
    const authOwner = { Authorization: `Bearer ${accessToken}` };

    const client = await Client.create({
      user: owner._id,
      company: company._id,
      name: "Cliente Horas",
      cif: "B77777111",
      address: addr(),
    });

    const project = await Project.create({
      user: owner._id,
      company: company._id,
      client: client._id,
      name: "Obra Horas",
      projectCode: "HR-ONLY-1",
      address: addr(),
      active: true,
    });

    const created = await request(app)
      .post("/api/deliverynote")
      .set(authOwner)
      .send({
        client: String(client._id),
        project: String(project._id),
        format: "hours",
        description: "Equipo en sitio",
        workDate: new Date().toISOString(),
        workers: [
          { name: "Ana", hours: 4 },
          { name: "Luis", hours: 2 },
        ],
      })
      .expect(201);

    expect(created.body.deliveryNote.format).toBe("hours");
    expect(created.body.deliveryNote.workers).toHaveLength(2);
  });
});
