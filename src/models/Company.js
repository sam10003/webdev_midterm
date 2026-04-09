import mongoose from "mongoose";

const companySchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    cif: { type: String, required: true },
    address: {
      street: String,
      number: String,
      postal: String,
      city: String,
      province: String,
    },
    logo: String,
    isFreelance: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Company = mongoose.model("Company", companySchema);

export default Company;
