// ✅ client/src/api.js
import axios from "axios";

/* =========================================================
   🌍 API 前缀（支持环境变量）
   ========================================================= */
const API_URL = import.meta.env.VITE_API_BASE || "/api";

// 添加网络连接检测函数
export const checkConnection = async () => {
  try {
    const baseUrl = import.meta.env.VITE_API_BASE || "";
    const response = await fetch(`${baseUrl}/api/health`);
    return response.ok;
  } catch (error) {
    console.error('Network connectivity check failed:', error);
    return false;
  }
};

/* =========================================================
   ⚙️ Axios 实例配置（统一拦截错误）
   ========================================================= */
const API = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// ✅ 请求拦截器（可选：附加通用 Token）
API.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ 响应拦截器（统一处理错误信息）
API.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err?.config?.url || "";
    const status = err?.response?.status;
    const msg =
      err?.response?.data?.message ||
      err?.message ||
      "Request failed. Please try again later.";

    // Borrow-limit detection (flag for downstream handlers)
    const isBorrowPath = url.includes("/library/borrow/");
    const isLimitByMsg = /借阅上限|30天内借阅上限|本月借阅数量已达上限/.test(
      String(err?.response?.data?.message || "")
    );
    if ((status === 400 && isBorrowPath) || isLimitByMsg) {
      err.__borrowLimit = true;
      // Avoid duplicate toast for borrow-limit errors; let page show modal
      return Promise.reject(err);
    }

    if (!url.includes("/login")) console.error(msg);
    return Promise.reject(err);
  }
);

/* =========================================================
   🧍 用户相关接口
   ========================================================= */

// ✅ 注册用户（Reader / Administrator）
// 参数顺序与后端保持一致：name, email, password, role, authCode（管理员需要）
export const register = (name, email, password, role, authCode) =>
  API.post("/users/register", { name, email, password, role, authCode });

// ✅ 登录用户
export const login = (userId, password) =>
  API.post("/users/login", { userId, password });

// ✅ 获取当前用户信息
export const getProfile = (token) =>
  API.get("/users/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });

// ✅ 更新用户信息
export const updateProfile = (token, updateData) =>
  API.put("/users/profile", updateData, {
    headers: { Authorization: `Bearer ${token}` },
  });

// ✅ 上传头像
export const uploadAvatar = (token, formData) =>
  API.post("/users/avatar", formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });

export const changePassword = (token, currentPassword, newPassword) =>
  API.put(
    "/users/password",
    { currentPassword, newPassword },
    { headers: { Authorization: `Bearer ${token}` } }
  );

export const getSessions = (token) =>
  API.get("/users/sessions", { headers: { Authorization: `Bearer ${token}` } });

export const revokeSession = (token, sessionId) =>
  API.delete(`/users/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });

export const revokeAllSessions = (token) =>
  API.post("/users/sessions/revoke-all", {}, { headers: { Authorization: `Bearer ${token}` } });

/* =========================================================
   📚 图书与借阅相关接口
   ========================================================= */

// ✅ 获取所有图书
export const getBooks = () => API.get("/library/books");

// ✅ 获取单本图书详情（含用户书评）
export const getBookDetail = (bookId) => API.get(`/library/books/${bookId}`);

// ✅ 借书
export const borrowBook = (bookId, token) =>
  API.post(
    `/library/borrow/${bookId}`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  );

// ✅ 提交归还申请
export const requestReturn = (bookId, bookTitle, token) =>
  API.post(
    `/library/request`,
    { type: "return", bookId, bookTitle },
    { headers: { Authorization: `Bearer ${token}` } }
  );

// ✅ 提交续借申请
export const requestRenew = (bookId, bookTitle, token) =>
  API.post(
    `/library/request`,
    { type: "renew", bookId, bookTitle },
    { headers: { Authorization: `Bearer ${token}` } }
  );

// 📝 提交书评
export const submitReview = (bookId, rating, comment, token) =>
  API.post(
    `/library/books/${bookId}/reviews`,
    { rating, comment },
    { headers: { Authorization: `Bearer ${token}` } }
  );

// 🔔 获取书评提醒
export const getReviewReminders = (token) =>
  API.get(`/library/review/reminders`, {
    headers: { Authorization: `Bearer ${token}` },
  });

// ✅ 获取当前借阅中记录
export const getBorrowedBooks = (token) =>
  API.get("/library/borrowed", {
    headers: { Authorization: `Bearer ${token}` },
  });

// ✅ 获取借阅历史
export const getBorrowHistory = (token) =>
  API.get("/library/history", {
    headers: { Authorization: `Bearer ${token}` },
  });

// ✅ 获取推荐书籍（首页 / 热门榜单）
export const getRecommendations = (token) =>
  API.get("/library/recommend", {
    headers: { Authorization: `Bearer ${token}` },
  });

/* =========================================================
   🧾 管理员相关接口
   ========================================================= */

// ✅ 获取所有借阅/归还申请（审批列表）
export const getAllRequests = (token) =>
  API.get("/library/requests", {
    headers: { Authorization: `Bearer ${token}` },
  });

// ✅ 审批申请（通过 / 拒绝）
// ✅ 修正管理员审批接口：
// - 通过：POST /api/library/requests/approve/:id
// - 拒绝：POST /api/library/requests/reject/:id （需提供 reason）
export const approveRequest = (id, approve, reason, token) => {
  const url = approve
    ? `/library/requests/approve/${id}`
    : `/library/requests/reject/${id}`;
  const body = approve ? {} : { reason };
  return API.post(url, body, {
    headers: { Authorization: `Bearer ${token}` },
  });
};

// ✅ 添加新书籍
export const addBook = (data, token) =>
  API.post("/library/books/add", data, {
    headers: { Authorization: `Bearer ${token}` },
  });

// ✅ 删除书籍
export const deleteBook = (id, token) =>
  API.delete(`/library/books/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export default API;
/* =========================================================
   📦 统一导出（兼容原 src/api/index.js 调用）
   ========================================================= */
// Library endpoints aliases
export const getBooksLibrary = getBooks;
export const borrowBookLibrary = (id) => API.post(`/library/borrow/${id}`);
export const getBorrowedBooksLibrary = getBorrowedBooks;
export const getBorrowHistoryLibrary = getBorrowHistory;

// Reader requests
export const requestRenewLibrary = (payload, token) =>
  API.post("/library/request", payload, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
export const requestReturnLibrary = (payload, token) =>
  API.post("/library/request", payload, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
export const getUserRequestsLibrary = (token) =>
  API.get("/library/request/user", { headers: { Authorization: `Bearer ${token}` } });

// Admin requests
export const getAllRequestsLibrary = (token) =>
  API.get("/library/requests", { headers: { Authorization: `Bearer ${token}` } });
export const approveRequestLibrary = (id, approve, reason, token) =>
  API.post(`/library/admin/requests/approve/${id}`, { approve, reason }, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
export const getPendingRequestsLibrary = (token) =>
  API.get("/library/requests/admin", { headers: { Authorization: `Bearer ${token}` } });

// Admin analytics and stats
export const getUserAnalytics = (token) =>
  API.get("/users/manage", { headers: { Authorization: `Bearer ${token}` } });
export const getCategoryStats = (token) =>
  API.get("/users/analytics/categories", { headers: { Authorization: `Bearer ${token}` } });
export const getBorrowHistoryAllLibrary = (token) =>
  API.get("/library/history/all", { headers: { Authorization: `Bearer ${token}` } });
export const getLibraryStats = (token) =>
  API.get("/library/stats", { headers: { Authorization: `Bearer ${token}` } });

// Comparison
export const getBookComparison = async (ids = [], windowDays = 30) => {
  if (!Array.isArray(ids) || ids.length < 2) {
    throw new Error("Please provide at least 2 book IDs to compare");
  }
  const params = { ids: ids.join(","), windowDays };
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const paths = ["/library/compare", "/library/compare/books", "/books/compare"]; // final fallback
  let lastErr = null;
  for (const p of paths) {
    try {
      const res = await API.get(p, { params, headers });
      return res.data;
    } catch (err) { lastErr = err; }
  }
  throw (lastErr || new Error("Failed to fetch book comparison; all paths attempted"));
};
