import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
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
    name: { type: String, required: true, trim: true },
    cif: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    address: {
      street: String,
      number: String,
      postal: String,
      city: String,
      province: String,
    },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

/** One active client per CIF within a company (soft-deleted rows ignored). */
clientSchema.index(
  { company: 1, cif: 1 },
  {
    unique: true,
    partialFilterExpression: { deleted: { $eq: false } },
  }
);

clientSchema.index({ company: 1, deleted: 1 });

const Client = mongoose.model("Client", clientSchema);

export default Client;
