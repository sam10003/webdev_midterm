import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: String,
    lastName: String,
    nif: String,
    role: { type: String, enum: ["admin", "guest"], default: "admin" },
    status: {
      type: String,
      enum: ["pending", "verified"],
      default: "pending",
      index: true,
    },
    verificationCode: String,
    verificationAttempts: { type: Number, default: 3 },
    company: { type: mongoose.Schema.Types.ObjectId, ref: "Company", index: true },
    refreshToken: String,
    address: {
      street: String,
      number: String,
      postal: String,
      city: String,
      province: String,
    },
    deleted: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

userSchema.virtual("fullName").get(function () {
  return [this.name, this.lastName].filter(Boolean).join(" ");
});

userSchema.index({ role: 1 });

const User = mongoose.model("User", userSchema);

export default User;
