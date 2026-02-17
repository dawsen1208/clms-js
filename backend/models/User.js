// backend/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true }, // 用户唯一标识
  name: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: false, default: "" }, // 邮箱（可选）
  password: { type: String, required: true }, // 加密密码
  role: { type: String, enum: ["Reader", "Administrator"], default: "Reader" }, // 用户角色
  status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" }, // 账号状态
  avatar: { type: String, default: "" }, // 头像URL

  // 🚫 黑名单功能
  isBlacklisted: { type: Boolean, default: false }, // 是否在黑名单
  blacklistReason: { type: String, default: "" }, // 拉黑原因
  overdueCount: { type: Number, default: 0 }, // 累计逾期次数 (用于自动拉黑)
  
  // 🔐 安全设置
  twoFactorEnabled: { type: Boolean, default: false }, // 是否开启双重认证
  authCode: { type: String, default: "" }, // 静态授权码（绑定邮箱时生成）
  tempAuthCode: { type: String, default: "" }, // 临时验证码
  tempAuthCodeExpires: { type: Date }, // 临时验证码过期时间
  login2faCodeHash: { type: String, default: null }, // 每次登录的动态验证码哈希
  login2faCodeExpiresAt: { type: Date, default: null }, // 动态验证码过期时间
  
  // ⚙️ 用户偏好设置
  preferences: {
    notifications: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      reminderDays: { type: Number, default: 3 }
    },
    // 其他偏好可扩展
    operation: { type: Object, default: {} },
    recommendation: { type: Object, default: {} },
    adminApproval: { type: Object, default: {} },
    adminPermissions: { type: Object, default: {} },
    security: { type: Object, default: {} },
    accessibility: { type: Object, default: {} }, // ✅ Accessibility preferences
    appearance: { type: Object, default: {} },     // ✅ Appearance preferences
    borrowing: {
      defaultDuration: { type: Number, default: 30, min: 1, max: 30 }
    }
  },

  // 📧 外部邮件通知（仅支持 Gmail）
  gmailAddress: { type: String, default: null },            // 仅 @gmail.com / @googlemail.com
  gmailVerified: { type: Boolean, default: false },         // 是否已通过验证码验证
  gmailVerifyCodeHash: { type: String, default: null },     // 验证码哈希（不存明文）
  gmailVerifyCodeExpiresAt: { type: Date, default: null },  // 验证码过期时间
  externalEmailNotifyEnabled: { type: Boolean, default: false }, // 应用外通知主开关（默认关闭）
  externalEmailNotifyEvents: {                               // 事件级别订阅（默认全关）
    borrow: { type: Boolean, default: false },
    return: { type: Boolean, default: false },
    requestApproved: { type: Boolean, default: false }
  },

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
