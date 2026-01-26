// ✅ 统一的认证中间件 - backend/middleware/authUnified.js
import jwt from "jsonwebtoken";

/**
 * 统一的JWT认证中间件
 * 标准化req.user对象结构：{ id, userId, name, role }
 */
export const authMiddleware = (req, res, next) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        message: "未提供认证令牌，请先登录",
        code: "NO_TOKEN"
      });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ 
        message: "认证令牌格式错误",
        code: "INVALID_TOKEN_FORMAT"
      });
    }

    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "mysecretkey");
    
    // 标准化req.user对象结构
    req.user = {
      id: decoded.id || decoded.userId,        // MongoDB ObjectId
      userId: decoded.userId,                    // 用户自定义ID (如 r000001)
      name: decoded.name || "",                 // 用户姓名
      role: decoded.role,                       // 用户角色 (Reader/Administrator)
      sessionId: decoded.sessionId || null      // 会话ID
    };

    // 验证必要字段
    if (!req.user.id || !req.user.userId || !req.user.role) {
      return res.status(401).json({ 
        message: "认证令牌数据不完整",
        code: "INCOMPLETE_TOKEN_DATA"
      });
    }

    next();
  } catch (error) {
    console.error("❌ 认证中间件错误:", error.message);
    
    let errorMessage = "认证失败";
    let errorCode = "AUTH_FAILED";
    
    if (error.name === "JsonWebTokenError") {
      errorMessage = "无效的认证令牌";
      errorCode = "INVALID_TOKEN";
    } else if (error.name === "TokenExpiredError") {
      errorMessage = "认证令牌已过期，请重新登录";
      errorCode = "TOKEN_EXPIRED";
    }
    
    return res.status(401).json({ 
      message: errorMessage,
      code: errorCode
    });
  }
};

/**
 * 管理员权限验证中间件
 * 必须在authMiddleware之后使用
 */
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "Administrator") {
    return res.status(403).json({ 
      message: "需要管理员权限",
      code: "INSUFFICIENT_PRIVILEGES"
    });
  }
  next();
};

/**
 * 读者权限验证中间件
 * 必须在authMiddleware之后使用
 */
export const requireReader = (req, res, next) => {
  if (req.user.role !== "Reader") {
    return res.status(403).json({ 
      message: "需要读者权限",
      code: "INSUFFICIENT_PRIVILEGES"
    });
  }
  next();
};

export default authMiddleware;