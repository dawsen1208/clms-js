/**
 * User Model
 * Defines the user schema including authentication, profile, preferences, and security settings.
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true }, // Unique user identifier
  name: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: false, default: "" }, // Email (optional)
  password: { type: String, required: true }, // Encrypted password
  role: { type: String, enum: ["Reader", "Administrator"], default: "Reader" }, // User role
  status: { type: String, enum: ["PENDING", "APPROVED", "REJECTED"], default: "PENDING" }, // Account status
  avatar: { type: String, default: "" }, // Avatar URL

  // Blacklist functionality
  isBlacklisted: { type: Boolean, default: false }, // Whether user is blacklisted
  blacklistReason: { type: String, default: "" }, // Reason for blacklisting
  overdueCount: { type: Number, default: 0 }, // Cumulative overdue count (for auto-blacklisting)
  
  // Security settings
  twoFactorEnabled: { type: Boolean, default: false }, // Enable 2FA
  authCode: { type: String, default: "" }, // Static authorization code (generated during email binding)
  tempAuthCode: { type: String, default: "" }, // Temporary verification code
  tempAuthCodeExpires: { type: Date }, // Temporary code expiration
  login2faCodeHash: { type: String, default: null }, // Dynamic 2FA code hash for login
  login2faCodeExpiresAt: { type: Date, default: null }, // Dynamic 2FA code expiration
  
  // User preferences
  preferences: {
    notifications: {
      inApp: { type: Boolean, default: true },
      email: { type: Boolean, default: false },
      reminderDays: { type: Number, default: 3 }
    },
    // Other extendable preferences
    operation: { type: Object, default: {} },
    recommendation: { type: Object, default: {} },
    adminApproval: { type: Object, default: {} },
    adminPermissions: { type: Object, default: {} },
    security: { type: Object, default: {} },
    accessibility: { type: Object, default: {} }, // Accessibility preferences
    appearance: { type: Object, default: {} },     // Appearance preferences
    borrowing: {
      defaultDuration: { type: Number, default: 30, min: 1, max: 30 }
    }
  },
  dismissedReviewReminders: [{ type: String, default: [] }],

  // External email notifications (Gmail only)
  gmailAddress: { type: String, default: null },            // Only @gmail.com / @googlemail.com
  gmailVerified: { type: Boolean, default: false },         // Whether Gmail is verified
  gmailVerifyCodeHash: { type: String, default: null },     // Verification code hash
  gmailVerifyCodeExpiresAt: { type: Date, default: null },  // Verification code expiration
  externalEmailNotifyEnabled: { type: Boolean, default: false }, // Main switch for external notifications
  externalEmailNotifyEvents: {                               // Event-level subscriptions
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
  createdAt: { type: Date, default: Date.now }, // Creation time
  updatedAt: { type: Date, default: Date.now }, // Update time
});

// Auto-encrypt password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Update timestamp
userSchema.pre("save", async function (next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = Date.now();
  }
  next();
});

// Validate password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Get public user info (hide sensitive data)
userSchema.methods.toPublicJSON = function () {
  const user = this.toObject();
  delete user.password;
  return user;
};

export default mongoose.model("User", userSchema);
