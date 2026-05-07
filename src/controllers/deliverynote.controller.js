import fs from "fs";
import path from "path";
import DeliveryNote from "../models/DeliveryNote.js";
import Project from "../models/Project.js";
import Client from "../models/Client.js";
import { AppError } from "../utils/AppError.js";
import { buildPaginatedResponse } from "../utils/pagination.js";
import { assertObjectId } from "../utils/object-id.js";
import {
  getDeliveryNotePdfAbsolutePath,
  getDeliveryNotePdfRelativePath,
  writeDeliveryNotePdfToDisk,
  streamPdfFile,
} from "../services/pdf.service.js";
import { emitToCompany, RT_EVENTS } from "../services/realtime.service.js";

const SORT_FIELDS = new Set(["workDate", "createdAt", "updatedAt", "format"]);

function requireCompany(req) {
  if (!req.user.company) {
    throw AppError.badRequest("User must belong to a company");
  }
  return req.user.company;
}

function parseSort(sortParam) {
  if (!sortParam || typeof sortParam !== "string") {
    return { workDate: -1 };
  }
  const desc = sortParam.startsWith("-");
  const field = desc ? sortParam.slice(1) : sortParam;
  if (!SORT_FIELDS.has(field)) {
    return { workDate: -1 };
  }
  return { [field]: desc ? -1 : 1 };
}

function noteCreatorId(note) {
  const u = note.user;
  if (u && typeof u === "object" && u._id) return String(u._id);
  return String(u);
}

function noteCompanyId(note) {
  const c = note.company;
  if (c && typeof c === "object" && c._id) return String(c._id);
  return String(c);
}

/**
 * Spec: same company and (note creator OR user is `guest`).
 */
function canDownloadPdf(req, note) {
  if (noteCompanyId(note) !== String(req.user.company)) return false;
  const isOwner = noteCreatorId(note) === String(req.user._id);
  const isGuest = req.user.role === "guest";
  return isOwner || isGuest;
}

async function assertProjectAndClientForBody(body, companyId) {
  const project = await Project.findOne({
    _id: body.project,
    company: companyId,
    deleted: false,
  });
  if (!project) {
    throw AppError.badRequest("Project not found for your company");
  }
  if (String(project.client) !== String(body.client)) {
    throw AppError.badRequest("Client does not match the selected project");
  }
  const client = await Client.findOne({
    _id: body.client,
    company: companyId,
    deleted: false,
  }).select("_id");
  if (!client) {
    throw AppError.badRequest("Client not found for your company");
  }
  return project;
}

const userPopulateSelect = "name lastName email role nif status";
const companyPopulateSelect = "name cif address isFreelance";

export const createDeliveryNote = async (req, res) => {
  const companyId = requireCompany(req);
  await assertProjectAndClientForBody(req.body, companyId);

  const note = await DeliveryNote.create({
    ...req.body,
    user: req.user._id,
    company: companyId,
  });

  emitToCompany(req.app.get("io"), companyId, RT_EVENTS.DELIVERY_NOTE_NEW, {
    deliveryNote: note,
  });

  res.status(201).json({ deliveryNote: note });
};

export const listDeliveryNotes = async (req, res) => {
  const companyId = requireCompany(req);
  const { page, limit, project, client, format, signed, from, to, sort } =
    req.validatedQuery;

  const filter = { company: companyId, deleted: false };

  if (project) filter.project = project;
  if (client) filter.client = client;
  if (format) filter.format = format;
  if (signed !== undefined) filter.signed = signed;

  if (from || to) {
    filter.workDate = {};
    if (from) filter.workDate.$gte = new Date(from);
    if (to) {
      const t = new Date(to);
      t.setHours(23, 59, 59, 999);
      filter.workDate.$lte = t;
    }
  }

  const sortObj = parseSort(sort);
  const skip = (page - 1) * limit;

  const [totalItems, rows] = await Promise.all([
    DeliveryNote.countDocuments(filter),
    DeliveryNote.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  res.json(buildPaginatedResponse(totalItems, page, limit, rows));
};

export const getDeliveryNoteById = async (req, res) => {
  const companyId = requireCompany(req);
  assertObjectId(req.params.id, "id");

  const note = await DeliveryNote.findOne({
    _id: req.params.id,
    company: companyId,
    deleted: false,
  })
    .populate({ path: "user", select: userPopulateSelect })
    .populate({ path: "company", select: companyPopulateSelect })
    .populate("client")
    .populate("project")
    .lean();

  if (!note) throw AppError.notFound("Delivery note not found");

  res.json({ deliveryNote: note });
};

export const downloadDeliveryNotePdf = async (req, res) => {
  const companyId = requireCompany(req);
  assertObjectId(req.params.id, "id");

  const note = await DeliveryNote.findOne({
    _id: req.params.id,
    company: companyId,
    deleted: false,
  })
    .populate({ path: "user", select: userPopulateSelect })
    .populate({ path: "company", select: companyPopulateSelect })
    .populate("client")
    .populate("project")
    .lean();

  if (!note) throw AppError.notFound("Delivery note not found");

  if (!canDownloadPdf(req, note)) {
    throw AppError.forbidden("You cannot download this delivery note");
  }

  const candidateRel = note.pdfPath || getDeliveryNotePdfRelativePath(note._id);
  const abs = path.isAbsolute(candidateRel)
    ? candidateRel
    : path.join(process.cwd(), candidateRel);

  if (fs.existsSync(abs)) {
    return streamPdfFile(
      res,
      abs,
      `delivery-note-${String(note._id).slice(-8)}.pdf`
    );
  }

  const relPath = await writeDeliveryNotePdfToDisk(note);
  await DeliveryNote.findByIdAndUpdate(note._id, { pdfPath: relPath });
  const absOut = path.join(process.cwd(), relPath);
  return streamPdfFile(
    res,
    absOut,
    `delivery-note-${String(note._id).slice(-8)}.pdf`
  );
};

export const signDeliveryNote = async (req, res) => {
  const companyId = requireCompany(req);
  assertObjectId(req.params.id, "id");

  const note = await DeliveryNote.findOne({
    _id: req.params.id,
    company: companyId,
    deleted: false,
  });

  if (!note) throw AppError.notFound("Delivery note not found");
  if (note.signed) {
    throw AppError.badRequest("Delivery note is already signed");
  }

  note.signatureData = req.body.signatureData;
  note.signed = true;
  note.signedAt = new Date();
  await note.save();

  const populated = await DeliveryNote.findById(note._id)
    .populate({ path: "user", select: userPopulateSelect })
    .populate({ path: "company", select: companyPopulateSelect })
    .populate("client")
    .populate("project")
    .lean();

  const relPath = await writeDeliveryNotePdfToDisk(populated);
  populated.pdfPath = relPath;
  await DeliveryNote.findByIdAndUpdate(note._id, { pdfPath: relPath });

  emitToCompany(req.app.get("io"), companyId, RT_EVENTS.DELIVERY_NOTE_SIGNED, {
    deliveryNote: populated,
  });

  res.json({
    message: "Delivery note signed",
    deliveryNote: populated,
    pdfPath: relPath,
  });
};

export const deleteDeliveryNote = async (req, res) => {
  const companyId = requireCompany(req);
  assertObjectId(req.params.id, "id");

  const note = await DeliveryNote.findOne({
    _id: req.params.id,
    company: companyId,
    deleted: false,
  });

  if (!note) throw AppError.notFound("Delivery note not found");
  if (note.signed) {
    throw AppError.badRequest("Cannot delete a signed delivery note");
  }

  note.deleted = true;
  await note.save();

  const absPdf = getDeliveryNotePdfAbsolutePath(note._id);
  if (fs.existsSync(absPdf)) {
    await fs.promises.unlink(absPdf).catch(() => {});
  }

  res.json({ message: "Delivery note deleted" });
};
