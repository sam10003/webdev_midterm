import mongoose from "mongoose";
import Company from "../src/models/Company.js";
import User from "../src/models/User.js";
import Client from "../src/models/Client.js";
import Project from "../src/models/Project.js";
import DeliveryNote from "../src/models/DeliveryNote.js";

describe("Mongoose models", () => {
  describe("Client partial unique index (company + cif)", () => {
    let companyId;
    let userId;

    beforeEach(async () => {
      const user = await User.create({
        email: `client-test-${Date.now()}@example.com`,
        password: "password1234",
      });
      userId = user._id;
      const company = await Company.create({
        owner: userId,
        name: "Test Co",
        cif: "COMP-CIF-01",
      });
      companyId = company._id;
      await Client.syncIndexes();
    });

    afterEach(async () => {
      await DeliveryNote.deleteMany({});
      await Project.deleteMany({});
      await Client.deleteMany({});
      await Company.deleteMany({});
      await User.deleteMany({});
    });

    it("rejects two active clients with the same CIF in the same company", async () => {
      const addr = {
        street: "S",
        number: "1",
        postal: "28001",
        city: "Madrid",
        province: "Madrid",
      };
      await Client.create({
        user: userId,
        company: companyId,
        name: "First",
        cif: "SHARED-CIF",
        address: addr,
      });
      await expect(
        Client.create({
          user: userId,
          company: companyId,
          name: "Second",
          cif: "SHARED-CIF",
          address: addr,
        })
      ).rejects.toThrow();
    });
  });

  describe("DeliveryNote format validation", () => {
    const ids = () => ({
      user: new mongoose.Types.ObjectId(),
      company: new mongoose.Types.ObjectId(),
      client: new mongoose.Types.ObjectId(),
      project: new mongoose.Types.ObjectId(),
    });

    it("requires material, quantity, and unit for material format", async () => {
      const doc = new DeliveryNote({
        ...ids(),
        format: "material",
        description: "Pour concrete",
        workDate: new Date(),
        material: "cement",
        unit: "kg",
      });
      await expect(doc.validate()).rejects.toThrow(/quantity/);
    });

    it("requires hours or workers for hours format", async () => {
      const doc = new DeliveryNote({
        ...ids(),
        format: "hours",
        description: "Site work",
        workDate: new Date(),
      });
      await expect(doc.validate()).rejects.toThrow(/hours/);
    });

    it("accepts hours-only note", async () => {
      const doc = new DeliveryNote({
        ...ids(),
        format: "hours",
        description: "Site work",
        workDate: new Date(),
        hours: 8,
      });
      await expect(doc.validate()).resolves.toBeUndefined();
    });
  });
});
