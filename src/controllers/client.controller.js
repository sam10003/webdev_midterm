import Client from "../models/Client.js";
import { emitToCompany, RT_EVENTS } from "../services/realtime.service.js";
import { AppError } from "../utils/AppError.js";
import { escapeRegex } from "../utils/escape-regex.js";
import { buildPaginatedResponse } from "../utils/pagination.js";
import { assertObjectId } from "../utils/object-id.js";

const SORT_FIELDS = new Set(["createdAt", "name", "updatedAt"]);

function requireCompany(req) {
  if (!req.user.company) {
    throw AppError.badRequest("User must belong to a company");
  }
  return req.user.company;
}

function parseSort(sortParam) {
  if (!sortParam || typeof sortParam !== "string") {
    return { createdAt: -1 };
  }
  const desc = sortParam.startsWith("-");
  const field = desc ? sortParam.slice(1) : sortParam;
  if (!SORT_FIELDS.has(field)) {
    return { createdAt: -1 };
  }
  return { [field]: desc ? -1 : 1 };
}

export const createClient = async (req, res) => {
  const companyId = requireCompany(req);

  const dup = await Client.findOne({
    company: companyId,
    cif: req.body.cif,
    deleted: false,
  });
  if (dup) {
    throw AppError.conflict(
      "A client with this CIF already exists for your company"
    );
  }

  const client = await Client.create({
    ...req.body,
    user: req.user._id,
    company: companyId,
  });

  emitToCompany(req.app.get("io"), companyId, RT_EVENTS.CLIENT_NEW, { client });

  res.status(201).json({ client });
};

export const listClients = async (req, res) => {
  const companyId = requireCompany(req);
  const { page, limit, name, sort } = req.validatedQuery;

  const filter = { company: companyId, deleted: false };
  if (name?.trim()) {
    filter.name = { $regex: escapeRegex(name.trim()), $options: "i" };
  }

  const sortObj = parseSort(sort);
  const skip = (page - 1) * limit;

  const [totalItems, data] = await Promise.all([
    Client.countDocuments(filter),
    Client.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
  ]);

  res.json(buildPaginatedResponse(totalItems, page, limit, data));
};

export const listArchivedClients = async (req, res) => {
  const companyId = requireCompany(req);
  const { page, limit, name, sort } = req.validatedQuery;

  const filter = { company: companyId, deleted: true };
  if (name?.trim()) {
    filter.name = { $regex: escapeRegex(name.trim()), $options: "i" };
  }

  const sortObj = parseSort(sort);
  const skip = (page - 1) * limit;

  const [totalItems, data] = await Promise.all([
    Client.countDocuments(filter),
    Client.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
  ]);

  res.json(buildPaginatedResponse(totalItems, page, limit, data));
};

export const getClientById = async (req, res) => {
  const companyId = requireCompany(req);
  assertObjectId(req.params.id, "id");

  const client = await Client.findOne({
    _id: req.params.id,
    company: companyId,
    deleted: false,
  }).lean();

  if (!client) throw AppError.notFound("Client not found");

  res.json({ client });
};

export const updateClient = async (req, res) => {
  const companyId = requireCompany(req);
  assertObjectId(req.params.id, "id");

  if (req.body.cif) {
    const clash = await Client.findOne({
      company: companyId,
      cif: req.body.cif,
      deleted: false,
      _id: { $ne: req.params.id },
    });
    if (clash) {
      throw AppError.conflict(
        "A client with this CIF already exists for your company"
      );
    }
  }

  const client = await Client.findOneAndUpdate(
    { _id: req.params.id, company: companyId, deleted: false },
    { $set: req.body },
    { returnDocument: "after", runValidators: true }
  );

  if (!client) throw AppError.notFound("Client not found");

  res.json({ client });
};

export const deleteClient = async (req, res) => {
  const companyId = requireCompany(req);
  assertObjectId(req.params.id, "id");
  const soft = req.query.soft === "true";

  if (soft) {
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, company: companyId, deleted: false },
      { deleted: true },
      { returnDocument: "after" }
    );
    if (!client) throw AppError.notFound("Client not found");
    return res.json({ message: "Client archived", client });
  }

  const removed = await Client.findOneAndDelete({
    _id: req.params.id,
    company: companyId,
  });
  if (!removed) throw AppError.notFound("Client not found");

  res.json({ message: "Client permanently deleted" });
};

export const restoreClient = async (req, res) => {
  const companyId = requireCompany(req);
  assertObjectId(req.params.id, "id");

  const archived = await Client.findOne({
    _id: req.params.id,
    company: companyId,
    deleted: true,
  });

  if (!archived) throw AppError.notFound("Archived client not found");

  const clash = await Client.findOne({
    company: companyId,
    cif: archived.cif,
    deleted: false,
  });
  if (clash) {
    throw AppError.conflict(
      "An active client with this CIF already exists; cannot restore"
    );
  }

  archived.deleted = false;
  await archived.save();

  res.json({ message: "Client restored", client: archived });
};
