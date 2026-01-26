// backend/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true }, // 用户唯一标识
  name: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: false, default: "" }, // 邮箱（可选）
  password: { type: String, required: true }, // 加密密码
  role: { type: String, enum: ["Reader", "Administrator"], default: "Reader" }, // 用户角色
  avatar: { type: String, default: "" }, // 头像URL
  sessions: [{
    id: { type: String, required: true }, // Session ID
    device: { type: String, default: "Unknown" }, // Device Info
    ip: { type: String, default: "" }, // IP Address
    loginTime: { type: Date, default: Date.now }, // Login Time
    lastUsedAt: { type: Date, default: Date.now } // Last Activity
  }],
  createdAt: { type: Date, default: Date.now }, // 创建时间
  updatedAt: { type: Date, default: Date.now }, // 更新时间
});

// ✅ 自动加密密码
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ✅ 更新时间戳
userSchema.pre("save", async function (next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// ✅ 验证密码
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ✅ 获取用户公开信息（隐藏敏感信息）
userSchema.methods.toPublicJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

export default mongoose.model("User", userSchema);
