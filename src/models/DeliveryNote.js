import mongoose from "mongoose";

const workerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    hours: { type: Number, required: true },
  },
  { _id: false }
);

const deliveryNoteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },
    format: {
      type: String,
      enum: ["material", "hours"],
      required: true,
    },
    description: { type: String, required: true, trim: true },
    workDate: { type: Date, required: true },
    material: { type: String, trim: true },
    quantity: { type: Number },
    unit: { type: String, trim: true },
    hours: { type: Number },
    workers: [workerSchema],
    signed: { type: Boolean, default: false },
    signedAt: { type: Date },
    signatureData: { type: String },
    pdfPath: { type: String },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

deliveryNoteSchema.index({ company: 1, deleted: 1 });
deliveryNoteSchema.index({ project: 1, workDate: -1 });
deliveryNoteSchema.index({ client: 1 });
deliveryNoteSchema.index({ format: 1 });
deliveryNoteSchema.index({ signed: 1 });
deliveryNoteSchema.index({ workDate: -1 });

deliveryNoteSchema.pre("validate", async function () {
  if (this.format === "material") {
    if (!this.material?.trim()) {
      throw new Error("material format requires `material`");
    }
    if (this.quantity == null || Number.isNaN(this.quantity)) {
      throw new Error("material format requires `quantity`");
    }
    if (!this.unit?.trim()) {
      throw new Error("material format requires `unit`");
    }
    this.hours = undefined;
    this.workers = undefined;
  } else if (this.format === "hours") {
    const hasHours = this.hours != null && !Number.isNaN(this.hours);
    const hasWorkers =
      Array.isArray(this.workers) &&
      this.workers.length > 0 &&
      this.workers.every((w) => w.name && w.hours != null);
    if (!hasHours && !hasWorkers) {
      throw new Error(
        "hours format requires `hours` and/or at least one `workers` entry with name and hours"
      );
    }
    this.material = undefined;
    this.quantity = undefined;
    this.unit = undefined;
  }
});

const DeliveryNote = mongoose.model("DeliveryNote", deliveryNoteSchema);

export default DeliveryNote;
