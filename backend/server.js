// ✅ backend/server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// ✅ 导入路由
import userRoutes from "./routes/userRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import borrowRequestRoutes from "./routes/borrowRequestRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";


// ✅ 加载环境变量
dotenv.config();
const app = express();

// 解析当前文件路径，计算前端构建目录（frontend/dist）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 优先检查当前目录下的 public 文件夹（生产环境部署）
let frontendDistPath = path.join(__dirname, "public");
if (!fs.existsSync(frontendDistPath)) {
  // 回退到上级兄弟目录（本地开发环境）
  frontendDistPath = path.resolve(__dirname, "../frontend/dist");
}
console.log("🗂️ frontendDistPath:", frontendDistPath, "exists:", fs.existsSync(frontendDistPath));

/* =========================================================
   🧩 基础中间件
   ========================================================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(morgan("dev"));

// 优先级最高：拦截根路径并返回前端入口，避免旧根路由覆盖
app.get("/", (req, res) => {
  const indexPath = path.join(frontendDistPath, "index.html");
  console.log("🧩 serving / ->", indexPath, "exists:", fs.existsSync(indexPath));
  res.sendFile(indexPath);
});

// 显式支持 /index.html，确保即使静态中间件未命中也能返回入口
app.get("/index.html", (req, res) => {
  const indexPath = path.join(frontendDistPath, "index.html");
  console.log("🧩 serving /index.html ->", indexPath, "exists:", fs.existsSync(indexPath));
  res.sendFile(indexPath);
});

// 早期挂载前端静态文件，确保 /index.html 可访问
app.use(
  express.static(frontendDistPath, {
    index: "index.html",
    maxAge: 0,
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    },
  })
);

// 兼容备用入口：/app 显式返回前端并映射静态资源
app.use(
  "/assets",
  express.static(path.join(frontendDistPath, "assets"), {
    maxAge: 0,
  })
);
app.get(/^\/app(?!\/api).*/, (req, res) => {
  const indexPath = path.join(frontendDistPath, "index.html");
  console.log("🧭 /app fallback ->", indexPath, "exists:", fs.existsSync(indexPath));
  res.sendFile(indexPath);
});

/* =========================================================
   🌐 CORS 设置（允许所有来源用于开发）
   ========================================================= */
const localIP = "127.0.0.1";
const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// 如果没有配置CLIENT_ORIGIN，则允许所有来源（开发模式）
if (allowedOrigins.length === 0) {
  console.log("⚠️ 未配置 CLIENT_ORIGIN，允许所有来源");
} else {
  console.log("✅ 已配置允许的来源:", allowedOrigins);
}

// 临时：允许所有来源用于测试
const uniqueOrigins = [
  ...new Set(allowedOrigins), 
  "https://clmsf5164136.z1.web.core.windows.net",
  "https://clms-backend-h7hqejd9bzfshwgu.norwayeast-01.azurewebsites.net"
];

const corsOptions = {
    origin: (origin, callback) => {
      console.log("🔍 CORS Check Origin:", origin);
      // 同源或未提供 Origin 的请求直接允许
      if (!origin) return callback(null, true);

      // 显式允许配置的来源
      if (uniqueOrigins.includes(origin)) return callback(null, true);

      // 允许所有 Blob 域名（Azure 静态网站）和 Azure Web App
      try {
        const url = new URL(origin);
        const host = url.hostname || "";
        if (
          host.endsWith(".blob.core.windows.net") || 
          host.endsWith(".web.core.windows.net") ||
          host.endsWith(".azurewebsites.net")
        ) {
          return callback(null, true);
        }
      } catch (_) {}

      console.warn("🚫 拒绝访问来源:", origin);
      return callback(new Error(`CORS not allowed from this origin: ${origin}`), false);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    optionsSuccessStatus: 204 // 处理 OPTIONS 返回 204
  };

app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // 显式处理 OPTIONS 请求

/* =========================================================
   📁 静态资源目录（头像上传）
   ========================================================= */

const isAzure = !!process.env.WEBSITE_SITE_NAME;
const uploadPath = isAzure 
  ? "/home/site/uploads" 
  : path.join(__dirname, "uploads");

app.use(
  "/uploads",
  express.static(uploadPath, {
    setHeaders: (res) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    },
    fallthrough: false // ❌ 如果找不到文件，直接返回 404，不要进入 SPA 回退
  })
);

// 🔍 调试信息
console.log(`📂 Upload path set to: ${uploadPath}`);
if (!fs.existsSync(uploadPath)) {
  console.warn(`⚠️ Upload path does not exist: ${uploadPath}`);
  try {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log(`✅ Created upload path: ${uploadPath}`);
  } catch (err) {
    console.error(`❌ Failed to create upload path: ${err.message}`);
    // 在 Azure 上，如果这里失败，可能是因为 /home/site 尚未挂载或不可写
    // 但通常 /home/site/uploads 是持久化存储的位置
  }
}

// 🐛 调试环境路由
app.get("/api/debug/env", (req, res) => {
  res.json({
    HOME: process.env.HOME,
    cwd: process.cwd(),
    __dirname,
    uploadPath,
    exists: fs.existsSync(uploadPath),
    env: process.env
  });
});

/* =========================================================
   🚏 路由注册（只保留 /api/library，彻底统一）
   ========================================================= */
console.log("🧭 正在注册路由...");

// ✅ 健康检查端点（必须在其他 /api 路由之前）
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/users", userRoutes);     // 👤 用户路由
app.use("/api/library", bookRoutes);   // 📚 图书 + 借阅相关
// 🚫 Deprecated: remove legacy /api/books mount
// Provide a temporary read-only notice endpoint for old clients
app.use("/api/books", (req, res) => {
  const newPath = req.path.replace(/^\/api\/books/, "/api/library");
  res.status(410).json({ message: "deprecated, use /api/library", new_base: "/api/library", hint: newPath });
});
app.use("/api/library/requests", borrowRequestRoutes);
// 兼容旧前端使用的 /api/borrow-requests 前缀
app.use("/api/borrow-requests", borrowRequestRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/notifications", notificationRoutes);

console.log("✅ 已注册路由前缀: /api/users, /api/library, /api/health, /api/feedback, /api/notifications");

/* =========================================================
   🖼️ 前端静态资源与 SPA 回退（非 /api 请求）
   ========================================================= */
// 提供前端构建的静态文件（关闭缓存，显式 index）
app.use(
  express.static(frontendDistPath, {
    index: "index.html",
    maxAge: 0,
    setHeaders: (res, _path) => {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    },
  })
);

// 显式根路由返回前端入口
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendDistPath, "index.html"));
});

// 对除 /api 之外的路由，统一返回前端入口（支持前端路由）
app.get(/^\/(?!api).*/, (req, res) => {
  const indexPath = path.join(frontendDistPath, "index.html");
  console.log("🧭 SPA fallback ->", indexPath, "exists:", fs.existsSync(indexPath));
  res.sendFile(indexPath);
});

/* =========================================================
   ⚙️ 启动服务器（允许局域网访问）
   ========================================================= */
const PORT = Number(process.env.PORT) || 5000;
// 默认绑定到 localhost，如需局域网访问可在 .env 设置 HOST=0.0.0.0
const HOST = process.env.HOST || "127.0.0.1";

console.log("🧩 MONGO_URI from .env:", process.env.MONGO_URI);

/* =========================================================
   🧠 MongoDB 连接：自动重试 + 断线重连
   ========================================================= */
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/clms_db";

const MAX_RETRIES = Number(process.env.MONGO_MAX_RETRIES || 30); // 最大重试次数（默认 30 次）
const INITIAL_DELAY_MS = Number(process.env.MONGO_RETRY_DELAY_MS || 500); // 初始重试间隔（默认 500ms）

const mongooseOpts = {
  serverSelectionTimeoutMS: 5000, // 服务器选择超时：5s
  socketTimeoutMS: 20000, // 套接字超时：20s
  connectTimeoutMS: 10000, // 连接超时：10s
  maxPoolSize: 10,
  minPoolSize: 1,
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectWithRetry() {
  let attempt = 0;
  let delay = INITIAL_DELAY_MS;
  while (attempt < MAX_RETRIES) {
    try {
      await mongoose.connect(MONGO_URI, mongooseOpts);
      console.log("✅ MongoDB 已成功连接");
      return true;
    } catch (err) {
      attempt += 1;
      console.error(
        `❌ MongoDB 连接失败 (第 ${attempt}/${MAX_RETRIES} 次)：`,
        err?.message || err
      );
      if (attempt >= MAX_RETRIES) {
        console.error("🛑 已达到最大重试次数，稍后将继续后台重连。");
        return false;
      }
      console.log(`⏳ ${delay}ms 后重试连接 MongoDB...`);
      await wait(delay);
      delay = Math.min(delay * 2, 10000); // 指数退避，封顶 10s
    }
  }
  return false;
}

// 连接事件监听：运行期断线自动重连
mongoose.connection.on("connected", () => {
  console.log("🔌 [MongoDB] connected");
});
mongoose.connection.on("error", (err) => {
  console.error("💥 [MongoDB] error:", err?.message || err);
});
mongoose.connection.on("disconnected", async () => {
  console.warn("⚠️  [MongoDB] disconnected，尝试后台重连...");
  // 后台重连（不阻塞请求处理）
  try {
    await mongoose.connect(MONGO_URI, mongooseOpts);
    console.log("✅ [MongoDB] 重连成功");
  } catch (err) {
    console.error("❌ [MongoDB] 重连失败：", err?.message || err);
  }
});

// 优雅关闭
const shutdown = async (signal) => {
  try {
    console.log(`📴 接收到信号 ${signal}，正在关闭服务器...`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("❌ 关闭过程中出现错误：", err?.message || err);
    process.exit(1);
  }
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// 启动流程：先连接数据库，成功后再启动 HTTP 服务
(async () => {
  const ok = await connectWithRetry();
  if (!ok) {
    console.warn(
      "⚠️ 首次连接 MongoDB 失败，HTTP 服务暂不启动；请确保 mongod 正在运行。"
    );
    return; // 避免无数据库情况下启动后产生大量运行期错误
  }

  app.listen(PORT, HOST, () => {
    console.log(`🚀 Server running at http://${HOST}:${PORT}`);
    console.log("🌐 Allowed Origins:");
    uniqueOrigins.forEach((o) => console.log("   -", o));
    console.log("🔓 服务器已对局域网开放（HOST=", HOST, ")");
  });
})();
