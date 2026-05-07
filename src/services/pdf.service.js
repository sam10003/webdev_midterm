import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import config from "../config/index.js";

// ── Paths (relative path stored on DeliveryNote.pdfPath) ────────────────

export function getPdfStorageAbsoluteRoot() {
  return path.join(process.cwd(), config.paths.pdfStorageRelative);
}

/** Value persisted on `DeliveryNote.pdfPath` (relative to cwd). */
export function getDeliveryNotePdfRelativePath(noteId) {
  return path.join(config.paths.pdfStorageRelative, `${String(noteId)}.pdf`);
}

export function getDeliveryNotePdfAbsolutePath(noteId) {
  return path.join(getPdfStorageAbsoluteRoot(), `${String(noteId)}.pdf`);
}

function formatDate(d) {
  if (!d) return "";
  const x = d instanceof Date ? d : new Date(d);
  return Number.isNaN(x.getTime()) ? "" : x.toISOString().slice(0, 10);
}

function formatAddress(obj) {
  if (!obj || typeof obj !== "object") return "";
  return [obj.street, obj.number, obj.postal, obj.city, obj.province]
    .filter(Boolean)
    .join(", ");
}

/**
 * Draws one delivery-note PDF page layout (pdfkit).
 * @param {PDFKit.PDFDocument} doc
 * @param {{ note: object; user?: object; client?: object; project?: object; company?: object }} ctx
 */
export function drawDeliveryNotePdf(doc, { note, user, client, project, company }) {
  const u = user && typeof user === "object" ? user : {};
  const c = client && typeof client === "object" ? client : {};
  const p = project && typeof project === "object" ? project : {};
  const co = company && typeof company === "object" ? company : {};

  doc.fontSize(20).text("Delivery note (Albarán)", { align: "center" });
  doc.moveDown(0.5);

  doc.fontSize(11).fillColor("#333333").text("Company", { underline: true });
  doc.fontSize(10).fillColor("#000000");
  doc.text(co.name ? `${co.name}${co.cif ? ` — CIF ${co.cif}` : ""}` : "—");
  const coAddr = formatAddress(co.address);
  if (coAddr) doc.text(coAddr);
  if (co.isFreelance) doc.fontSize(9).fillColor("#444444").text("Freelance / autónomo");
  doc.fillColor("#000000").moveDown();

  doc.fontSize(11).fillColor("#333333").text("Client", { underline: true });
  doc.fontSize(10).fillColor("#000000");
  doc.text(`${c.name || "—"} (${c.cif || "—"})`);
  const clAddr = formatAddress(c.address);
  if (clAddr) doc.text(clAddr);
  doc.moveDown();

  doc.fontSize(11).fillColor("#333333").text("Project", { underline: true });
  doc.fontSize(10).fillColor("#000000");
  doc.text(`${p.name || "—"} — ${p.projectCode || "—"}`);
  const pjAddr = formatAddress(p.address);
  if (pjAddr) doc.text(pjAddr);
  doc.moveDown();

  doc.fontSize(11).fillColor("#333333").text("Note details", { underline: true });
  doc.fontSize(10).fillColor("#000000");
  doc.text(
    `Created by: ${[u.name, u.lastName].filter(Boolean).join(" ") || u.email || "—"}`
  );
  if (u.email) doc.text(`Contact email: ${u.email}`);
  doc.text(`Work date: ${formatDate(note.workDate)}`);
  doc.text(`Format: ${note.format}`);
  doc.moveDown(0.3);
  doc.text(`Description: ${note.description || ""}`);
  doc.moveDown();

  if (note.format === "material") {
    doc.text(`Material: ${note.material || ""}`);
    doc.text(`Quantity: ${note.quantity ?? ""} ${note.unit || ""}`);
  } else {
    if (note.hours != null) doc.text(`Hours (total): ${note.hours}`);
    if (Array.isArray(note.workers) && note.workers.length) {
      doc.moveDown(0.3);
      doc.text("Workers:");
      note.workers.forEach((w) => {
        doc.text(`  • ${w.name}: ${w.hours} h`);
      });
    }
  }

  doc.moveDown();
  if (note.signed) {
    doc.fontSize(11).text("Signature", { underline: true });
    doc.fontSize(10).text(`Signed at: ${formatDate(note.signedAt)}`);
    if (note.signatureData) {
      try {
        const raw = String(note.signatureData);
        const b64 = raw.includes(",") ? raw.split(",").pop() : raw;
        const buf = Buffer.from(b64, "base64");
        doc.moveDown(0.3);
        doc.image(buf, { fit: [240, 140] });
      } catch {
        doc.text("(Signature image could not be embedded)");
      }
    }
  }
}

/**
 * Pipes a freshly generated PDF to an Express response (no disk write).
 * Use when regenerating on download if no cached file exists.
 */
export function pipeDeliveryNotePdfToResponse(res, payload, downloadName) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${downloadName || "delivery-note.pdf"}"`
  );
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  drawDeliveryNotePdf(doc, payload);
  doc.end();
}

/**
 * Saves PDF under configured storage dir. Returns **relative** path for `DeliveryNote.pdfPath`.
 * @param {{ note: object; user?: object; client?: object; project?: object; company?: object }} payload
 */
export async function saveDeliveryNotePdf(payload) {
  const { note } = payload;
  const outPath = getDeliveryNotePdfAbsolutePath(note._id);
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(outPath);
    doc.pipe(stream);
    drawDeliveryNotePdf(doc, payload);
    doc.end();
    stream.on("finish", () => resolve(getDeliveryNotePdfRelativePath(note._id)));
    stream.on("error", reject);
  });
}

/**
 * Backwards-compatible helper: pass a **lean** note with populated `user`, `client`, `project`, `company`.
 */
export async function writeDeliveryNotePdfToDisk(note) {
  return saveDeliveryNotePdf({
    note,
    user: typeof note.user === "object" ? note.user : undefined,
    client: typeof note.client === "object" ? note.client : undefined,
    project: typeof note.project === "object" ? note.project : undefined,
    company: typeof note.company === "object" ? note.company : undefined,
  });
}

/**
 * Streams an existing PDF file from disk.
 */
export function streamPdfFile(res, absolutePath, downloadName) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${downloadName || "delivery-note.pdf"}"`
  );
  const read = fs.createReadStream(absolutePath);
  read.on("error", () => {
    if (!res.headersSent) res.status(500).end();
  });
  read.pipe(res);
}
