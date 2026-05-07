import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
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
    name: { type: String, required: true, trim: true },
    projectCode: { type: String, required: true, trim: true },
    address: {
      street: String,
      number: String,
      postal: String,
      city: String,
      province: String,
    },
    email: { type: String, trim: true },
    notes: { type: String },
    active: { type: Boolean, default: true },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/** One active project code per company (soft-deleted rows ignored). */
projectSchema.index(
  { company: 1, projectCode: 1 },
  {
    unique: true,
    partialFilterExpression: { deleted: { $eq: false } },
  }
);

projectSchema.index({ company: 1, deleted: 1 });
projectSchema.index({ client: 1 });

const Project = mongoose.model("Project", projectSchema);

export default Project;
