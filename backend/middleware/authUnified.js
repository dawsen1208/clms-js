/**
 * Unified Authentication Middleware
 * Validates JWT tokens and checks user roles and account status.
 */
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Main Authentication Middleware
export const authenticate = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecretkey");
      
      // Select public fields only
      req.user = await User.findById(decoded.id).select("-password");
      
      if (!req.user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }

      // Role and Status Check
      if (req.user.status === "PENDING") {
        return res.status(403).json({ message: "Your account is pending approval by an administrator." });
      }
      if (req.user.status === "REJECTED") {
        return res.status(403).json({ message: "Your registration has been rejected." });
      }

      next();
    } catch (error) {
      console.error("Auth error:", error);
      res.status(401).json({ message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

// Administrator Check
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "Administrator") {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as an administrator" });
  }
};

// Reader Check (Allowing Administrator to also access Reader functionality)
export const readerOnly = (req, res, next) => {
  if (req.user && (req.user.role === "Reader" || req.user.role === "Administrator")) {
    next();
  } else {
    res.status(403).json({ message: "Not authorized as a reader" });
  }
};

export const authMiddleware = authenticate;
export const requireAdmin = adminOnly;
export const requireReader = readerOnly;
