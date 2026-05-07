import Project from "../models/Project.js";
import Client from "../models/Client.js";
import { emitToCompany, RT_EVENTS } from "../services/realtime.service.js";
import { AppError } from "../utils/AppError.js";
import { escapeRegex } from "../utils/escape-regex.js";
import { buildPaginatedResponse } from "../utils/pagination.js";
import { assertObjectId } from "../utils/object-id.js";

const SORT_FIELDS = new Set(["createdAt", "name", "updatedAt", "projectCode"]);

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

async function assertClientInCompany(clientId, companyId) {
  const client = await Client.findOne({
    _id: clientId,
    company: companyId,
    deleted: false,
  }).select("_id");
  if (!client) {
    throw AppError.badRequest("Client not found or does not belong to your company");
  }
  return client;
}

export const createProject = async (req, res) => {
  const companyId = requireCompany(req);
  await assertClientInCompany(req.body.client, companyId);

  const dup = await Project.findOne({
    company: companyId,
    projectCode: req.body.projectCode,
    deleted: false,
  });
  if (dup) {
    throw AppError.conflict(
      "A project with this code already exists for your company"
    );
  }

  const project = await Project.create({
    ...req.body,
    user: req.user._id,
    company: companyId,
  });

  emitToCompany(req.app.get("io"), companyId, RT_EVENTS.PROJECT_NEW, { project });

  res.status(201).json({ project });
};

export const listProjects = async (req, res) => {
  const companyId = requireCompany(req);
  const { page, limit, client: clientId, name, active, sort } = req.validatedQuery;

  const filter = { company: companyId, deleted: false };

  if (clientId) {
    filter.client = clientId;
  }
  if (name?.trim()) {
    filter.name = { $regex: escapeRegex(name.trim()), $options: "i" };
  }
  if (active !== undefined) {
    filter.active = active;
  }

  const sortObj = parseSort(sort);
  const skip = (page - 1) * limit;

  const [totalItems, data] = await Promise.all([
    Project.countDocuments(filter),
    Project.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
  ]);

  res.json(buildPaginatedResponse(totalItems, page, limit, data));
};

export const listArchivedProjects = async (req, res) => {
  const companyId = requireCompany(req);
  const { page, limit, client: clientId, name, active, sort } = req.validatedQuery;

  const filter = { company: companyId, deleted: true };

  if (clientId) {
    filter.client = clientId;
  }
  if (name?.trim()) {
    filter.name = { $regex: escapeRegex(name.trim()), $options: "i" };
  }
  if (active !== undefined) {
    filter.active = active;
  }

  const sortObj = parseSort(sort);
  const skip = (page - 1) * limit;

  const [totalItems, data] = await Promise.all([
    Project.countDocuments(filter),
    Project.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
  ]);

  res.json(buildPaginatedResponse(totalItems, page, limit, data));
};

export const getProjectById = async (req, res) => {
  const companyId = requireCompany(req);
  assertObjectId(req.params.id, "id");

  const project = await Project.findOne({
    _id: req.params.id,
    company: companyId,
    deleted: false,
  }).lean();

  if (!project) throw AppError.notFound("Project not found");

  res.json({ project });
};

export const updateProject = async (req, res) => {
  const companyId = requireCompany(req);
  assertObjectId(req.params.id, "id");

  if (req.body.client) {
    await assertClientInCompany(req.body.client, companyId);
  }

  if (req.body.projectCode) {
    const clash = await Project.findOne({
      company: companyId,
      projectCode: req.body.projectCode,
      deleted: false,
      _id: { $ne: req.params.id },
    });
    if (clash) {
      throw AppError.conflict(
        "A project with this code already exists for your company"
      );
    }
  }

  const project = await Project.findOneAndUpdate(
    { _id: req.params.id, company: companyId, deleted: false },
    { $set: req.body },
    { returnDocument: "after", runValidators: true }
  );

  if (!project) throw AppError.notFound("Project not found");

  res.json({ project });
};

export const deleteProject = async (req, res) => {
  const companyId = requireCompany(req);
  assertObjectId(req.params.id, "id");
  const soft = req.query.soft === "true";

  if (soft) {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, company: companyId, deleted: false },
      { deleted: true },
      { returnDocument: "after" }
    );
    if (!project) throw AppError.notFound("Project not found");
    return res.json({ message: "Project archived", project });
  }

  const removed = await Project.findOneAndDelete({
    _id: req.params.id,
    company: companyId,
  });
  if (!removed) throw AppError.notFound("Project not found");

  res.json({ message: "Project permanently deleted" });
};

export const restoreProject = async (req, res) => {
  const companyId = requireCompany(req);
  assertObjectId(req.params.id, "id");

  const archived = await Project.findOne({
    _id: req.params.id,
    company: companyId,
    deleted: true,
  });

  if (!archived) throw AppError.notFound("Archived project not found");

  const clash = await Project.findOne({
    company: companyId,
    projectCode: archived.projectCode,
    deleted: false,
  });
  if (clash) {
    throw AppError.conflict(
      "An active project with this code already exists; cannot restore"
    );
  }

  archived.deleted = false;
  await archived.save();

  res.json({ message: "Project restored", project: archived });
};
