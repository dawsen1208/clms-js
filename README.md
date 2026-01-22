# CLMS-JS 图书馆管理系统

一个前后端分离的图书馆管理系统，支持读者与管理员两种角色，提供借阅、续借、归还、书评、推荐与对比、头像上传、用户画像分析与通知提醒等完整功能。

## 功能概览

- 用户与权限
  - `Reader`：浏览图书、借阅/续借/归还、提交书评、查看历史与通知、更新资料与头像
  - `Administrator`：新增/删除图书、审批续借/归还申请、查看待处理申请、用户画像与统计
- 图书管理与检索
  - 列表与详情、推荐与相似书籍、书籍对比、书评与提醒
- 借阅全流程
  - 借阅、续借与归还申请、审批通过/拒绝、借阅历史与已借阅清单
- 用户资料
  - 获取与更新个人资料、头像上传（后端使用 `multer`，文件存储于 `backend/uploads/`）
- 通知与提醒
  - 书评提醒、借阅状态提示（前端统一错误处理与消息提示）

## 技术栈

- 前端：`React`、`Vite`、`Ant Design`、`Axios`、`React Router`
- 后端：`Node.js`、`Express`、`Mongoose`、`MongoDB`、`JWT`、`multer`
- 其他：`dotenv`、`helmet`、`morgan`、`cors`、`nodemon`

## 目录结构

```
clms-js/
├── backend/
│   ├── server.js                 # 后端入口（统一使用此入口）
│   ├── middleware/authUnified.js # 统一认证与权限中间件
│   ├── routes/
│   │   ├── bookRoutes.js         # 图书相关接口
│   │   ├── borrowRequestRoutes.js# 管理员审批相关接口
│   │   └── userRoutes.js         # 用户与画像相关接口
│   ├── models/                   # Mongoose 模型（User、Book、BorrowRecord、BorrowHistory、BorrowRequest）
│   ├── scripts/                  # 数据增强脚本
│   ├── seed*.js                  # 多种种子数据脚本
│   ├── uploads/                  # 头像与上传的静态文件
│   └── .env                      # 后端环境变量（本地）
├── frontend/
│   ├── src/
│   │   ├── api/                  # 新版 API 封装（`index.js` 为主）
│   │   ├── api.js                # 兼容旧版的部分 API 封装（仍有引用）
│   │   ├── components/ pages/    # 组件与页面
│   │   └── data/ utils/ assets/  # 静态数据、工具与资源
│   ├── public/
│   │   ├── books/                # 前端展示用的封面资源等
│   │   └── vite.svg              # 作为 favicon 使用
│   ├── index.html                # Vite 入口模板
│   └── .env                      # 前端环境变量（本地）
└── uploads/                      # 额外上传目录（如需）
```

## 快速开始

### 前置要求

- 安装 `Node.js`（建议 `>= 18`）与 `npm`
- 准备好 MongoDB（本地或云端连接串）

### 安装依赖

- 后端
  - 进入 `backend/` 目录
  - 安装依赖：`npm install`
- 前端
  - 进入 `frontend/` 目录
  - 安装依赖：`npm install`

### 配置环境变量

- 后端（`backend/.env`）示例：
  ```env
  PORT=5000
  MONGODB_URI=mongodb://localhost:27017/clms-js
  JWT_SECRET=please-change-me
  CORS_ORIGIN=http://localhost:5173
  ```
- 前端（`frontend/.env`）示例（默认同源，建议留空）：
  ```env
  # VITE_API_BASE=
  # 留空表示使用当前页面同源作为后端，如部署到隧道/反向代理域名时，接口走相对路径 /api 即可
  ```

> 提示：请勿在仓库中提交真实密钥与生产环境配置。建议改用 `*.env.example` 模板文件。

### 启动开发环境

- 后端（在 `backend/`）：
  - 开发模式：`npm run dev`（使用 `nodemon` 热重载）
  - 生产模式：`npm start`
- 前端（在 `frontend/`）：
  - 开发模式：`npm run dev`（默认 `http://localhost:5173`，可使用 `--port` 指定端口）
  - 预览构建产物：`npm run preview`

前后端启动后，前端会通过 `VITE_API_BASE` 与后端进行交互。

## 数据脚本与种子数据

- 可选脚本（在 `backend/` 运行）：
  - `npm run seed:books`：插入基础书目
  - `npm run seed:books:bulk`：批量插入更多书目
  - `npm run seed:demo`：插入演示数据（用户、借阅记录等）
  - `npm run fix:book-titles`：修复书名
  - `npm run enrich:descriptions`：丰富书籍描述

> 运行前请确保 `MONGODB_URI` 已正确配置并指向期望的数据库。

## API 概览（简版）

- 基地址：`/api`
- 认证：JWT（登录后前端通过 Axios 拦截器自动附加 `Authorization: Bearer <token>`）
- 主要路由：
  - `books`：获取列表、详情、推荐、对比、添加/删除、书评、借阅与历史等（详见 `backend/routes/bookRoutes.js`）
  - `borrow-requests`：管理员审批相关（获取待处理、通过、拒绝）（详见 `backend/routes/borrowRequestRoutes.js`）
  - `users`：登录/注册、资料与头像、画像与统计（详见 `backend/routes/userRoutes.js`）
- 前端 API 封装：`frontend/src/api/index.js`（新版）与 `frontend/src/api.js`（兼容旧版）

> 如果需要更完整的接口文档（请求/响应字段），可在后续加入 `docs/API.md`，或依据路由文件生成文档。

## 构建与部署

- 前端构建（在 `frontend/`）：`npm run build`
  - 构建产物位于 `frontend/dist/`
- 后端部署：
  - 使用 `npm start` 或使用进程管理工具（如 PM2）
  - 配置环境变量（生产数据库、JWT 密钥、CORS 允许来源等）
  - 建议启用反向代理与 HTTPS（如 Nginx）

## PWA 安装与使用

- 已接入 `vite-plugin-pwa`，前端在构建后支持作为可安装的 Web App。
- 预览与测试：在 `frontend/` 执行 `npm run preview -- --host --port 5180`，手机在同一 Wi‑Fi 下访问网络地址即可查看并“添加到主屏幕”。
- 安装入口：
  - Android/Chrome：地址栏右侧或菜单中出现“安装应用”/“添加到主屏幕”。
  - iOS/Safari：使用“分享”按钮选择“添加到主屏幕”。
- 图标说明：当前使用 `public/vite.svg` 作为占位图标；建议后续在 `frontend/public/icons/` 提供 `pwa-192.png`、`pwa-512.png`、`pwa-maskable.png` 并在 `vite.config.js` 的 `manifest.icons` 中替换为这些 PNG。
- 注意事项：
  - PWA 的 Service Worker 在构建/预览模式生效（开发模式不注册），请使用 `npm run build` + `npm run preview` 或部署到 HTTPS 环境测试安装体验。
  - 写操作（借阅/审批等）不做离线缓存；读操作可按需配置缓存策略。

## 常见问题

- 端口冲突：前端可使用 `npm run dev -- --port 5180` 指定端口；后端通过 `PORT` 环境变量指定
- 认证失败：前端默认同源，无需设置 `VITE_API_BASE`；如需跨域或自定义域，请确保后端为 HTTPS、CORS 放行该来源，并根据需要调整 CSP 的 `connect-src`
- 静态资源：头像与上传文件存储于 `backend/uploads/`，前端展示封面资源在 `frontend/public/books/`
- 接口兼容：前端存在新旧两套 API 封装（`api/` 与 `api.js`），两者均有被引用，后续可逐步统一

## 贡献指南

- 提交前运行 `npm run lint`（前端）与基本自测
- 如需新增接口或重构，请同步更新相应的路由与前端 API 层
- 欢迎通过 Issue 与 PR 反馈与贡献

## 许可证

- 当前仓库未设置许可证。建议选择合适的开源许可证（如 MIT），并在根目录添加 `LICENSE` 文件。

---

如需更详细的接口字段说明、系统架构图或交互流程图，可在 `docs/` 目录新增文档（例如：`docs/API.md`、`docs/Architecture.md`、`docs/Flows.md`），或联系维护者协助输出。