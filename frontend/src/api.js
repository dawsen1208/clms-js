/**
 * API Service Layer
 * Defines Axios instance and functions for all backend communication, including interceptors for auth and error handling.
 */
import axios from "axios";

/* =========================================================
   🌍 API Configuration (Environment variable support)
   ========================================================= */
const rawApiBase = import.meta.env.VITE_API_BASE || "/api";
const normalizeApiBase = (base) => {
  const b = String(base || "").trim().replace(/\/+$/, "");
  if (!b) return "/api";
  return b
    .replace(/\/api\/books$/i, "/api")
    .replace(/\/api\/library$/i, "/api")
    .replace(/\/api\/borrow-requests$/i, "/api")
    .replace(/\/api\/notifications$/i, "/api")
    .replace(/\/api\/feedback$/i, "/api");
};
const API_URL = normalizeApiBase(rawApiBase);

// Network connection detection helper
export const checkConnection = async () => {
  try {
    const baseUrl = normalizeApiBase(import.meta.env.VITE_API_BASE || "");
    const response = await fetch(`${baseUrl}/health`);
    return response.ok;
  } catch (error) {
    console.error('Network connectivity check failed:', error);
    return false;
  }
};

/* =========================================================
   ⚙️ Axios Instance & Interceptors
   ========================================================= */
const API = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Request interceptor: attach Authorization token
API.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: unified error handling
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
    const isBorrowPath = url.includes("/borrow/") || url.includes("library/borrow");
    
    const rawMsg = err?.response?.data?.message || "";
    const isLimitByMsg = /借阅上限|30天内借阅上限|本月借阅数量已达上限|达到同时借阅上限|limit reached|borrowing limit|maximum number|exceeded/i.test(String(rawMsg));
    
    if (((status === 400 || status === 403) && isBorrowPath) || isLimitByMsg) {
      console.warn("🚫 Borrow limit detected in interceptor", { url, status, msg: rawMsg });
      err.__borrowLimit = true;
      // Avoid duplicate toast for borrow-limit errors; let page show modal
      return Promise.reject(err);
    }

    if (!url.includes("/login")) console.error(msg);
    return Promise.reject(err);
  }
);

/* =========================================================
   🧍 User & Auth API
   ========================================================= */

// Register user (Reader / Administrator)
export const register = (name, email, password, role, authCode) =>
  API.post("/users/register", { name, email, password, role, authCode });

// Login user
export const login = (userId, password) =>
  API.post("/users/login", { userId, password });

// Get current user profile
export const getProfile = (token) =>
  API.get("/users/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });

// Update user profile
export const updateProfile = (token, updateData) =>
  API.put("/users/profile", updateData, {
    headers: { Authorization: `Bearer ${token}` },
  });

// Upload user avatar
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

// ✅ 发送邮箱验证码
export const sendAuthCode = (token, email) =>
  API.post("/users/send-auth-code", { email }, {
    headers: { Authorization: `Bearer ${token}` }
  });

// ✅ 绑定邮箱
export const bindEmail = (token, email, code) =>
  API.post("/users/bind-email", { email, code }, {
    headers: { Authorization: `Bearer ${token}` }
  });

// ✅ 切换双重认证
export const toggle2FA = (token, enabled) =>
  API.post("/users/toggle-2fa", { enabled }, {
    headers: { Authorization: `Bearer ${token}` }
  });

// ✅ 2FA 登录验证
export const login2FA = (userId, code) =>
  API.post("/users/login/2fa", { userId, code });

export const getSessions = (token) =>
  API.get("/users/sessions", { headers: { Authorization: `Bearer ${token}` } });

export const revokeSession = (token, sessionId) =>
  API.delete(`/users/sessions/${sessionId}`, { headers: { Authorization: `Bearer ${token}` } });

export const revokeAllSessions = (token) =>
  API.delete("/users/sessions", { headers: { Authorization: `Bearer ${token}` } });

/* =========================================================
   📚 Library & Book API
   ========================================================= */

// Get all books
export const getBooks = () => API.get("/library/books");

// Get a single book by ID
export const getBookById = (id) => API.get(`/library/books/${id}`);

// Get book details
export const getBookDetail = (id) => API.get(`/library/books/${id}`);

export const searchBooks = (query) => API.get(`/library/books?q=${encodeURIComponent(String(query || ""))}`);

// Borrow a book
export const borrowBook = (bookId) => API.post(`/library/borrow/${bookId}`);

export const cancelBorrow = (bookId) => API.post(`/library/borrow/${bookId}/cancel`);

// Get currently borrowed books for the logged-in user
export const getBorrowedBooks = () => API.get("/library/borrowed");

// Return a book (Admin only)
export const returnBook = (userId, bookId) =>
  API.post("/library/return", { userId, bookId });

// Get user borrowing history
export const getBorrowHistory = () => API.get("/library/history");

// Submit a renewal or return request
export const submitRequestLibrary = (payloadOrBookId, bookTitle, type, days) => {
  const payload =
    payloadOrBookId && typeof payloadOrBookId === "object"
      ? payloadOrBookId
      : { bookId: payloadOrBookId, bookTitle, type, days };
  return API.post("/library/request", payload);
};

// Get user's own requests
export const getUserRequestsLibrary = () => API.get("/library/request/user");

// Get all requests (Admin only)
export const getAllRequestsLibrary = () => API.get("/borrow-requests/admin");
export const getPendingRequestsLibrary = () => API.get("/library/requests/admin");

// Approve a request (Admin only)
export const approveRequestLibrary = (requestId) =>
  API.post(`/borrow-requests/approve/${requestId}`);

// Reject a request (Admin only)
export const rejectRequestLibrary = (requestId, reason) =>
  API.post(`/borrow-requests/reject/${requestId}`, { reason });

// Delete a book (Admin only)
export const deleteBook = (id) => API.delete(`/library/books/${id}`);

// Get admin dashboard statistics
export const getStats = () => API.get("/library/stats");

// Get active borrow records (Admin only)
export const getActiveBorrows = () => API.get("/library/active-borrows");
export const getBorrowHistoryAllLibrary = () => API.get("/library/history/all");

// Get user list (Admin only)
export const getUsers = () => API.get("/users/all");

// User analytics (Admin)
export const getUserAnalytics = () => API.get("/users/manage");

// Update user status (Admin only)
export const updateUserStatus = (userId, status) =>
  API.put(`/users/status/${userId}`, { status });

// Delete user (Admin only)
export const deleteUser = (userId) => API.delete(`/users/${userId}`);

// Update user role (Admin only)
export const updateUserRole = (userId, role) =>
  API.put(`/users/role/${userId}`, { role });

// Toggle blacklist (Admin)
export const toggleBlacklist = (userId, isBlacklisted, reason = "") =>
  API.put(`/users/blacklist/${userId}`, { isBlacklisted, reason });

// Approve or reject user (Admin)
export const approveUser = (userId, status) =>
  API.put(`/users/approve/${userId}`, { status });

// Get recommended books
export const getRecommendations = () => API.get("/library/recommend");

// Compare books by IDs
export const getBookComparison = (ids, windowDays = 30) =>
  API.get(`/library/books/compare?ids=${ids.join(",")}&windowDays=${windowDays}`);

// Add a book review
export const addBookReview = (bookId, rating, comment) =>
  API.post(`/library/books/${bookId}/reviews`, { rating, comment });

// Submit a review
export const submitReview = (bookId, rating, comment) =>
  API.post(`/library/books/${bookId}/reviews`, { rating, comment });

// Add a new book (Admin only)
export const addBook = (bookData) => API.post("/library/books/add", bookData);

/* =========================================================
   💬 Feedback API
   ========================================================= */

// Submit feedback
export const submitFeedback = (content, email = "") => API.post("/feedback", { content, email });

// Get user's feedback
export const getUserFeedback = () => API.get("/feedback/my");

// Get all feedback (Admin only)
export const getAllFeedback = () => API.get("/feedback");

// Reply to feedback (Admin only)
export const replyFeedback = (id, adminReply) =>
  API.put(`/feedback/${id}/reply`, { reply: adminReply });
export const deleteFeedback = (id) => API.delete(`/feedback/${id}`);

/* =========================================================
   🔔 Notification API
   ========================================================= */

// Get user notifications
export const getNotifications = () => API.get("/notifications");

// Mark notification as read
export const markNotificationAsRead = (id) =>
  API.put(`/notifications/${id}/read`);

// Get review reminders
export const getReviewReminders = () => API.get("/library/review/reminders");

// Dismiss a review reminder
export const dismissReviewReminder = (bookId) =>
  API.post(`/library/review/reminders/${bookId}/dismiss`);

/* =========================================================
   📧 Email Binding & Verification API
   ========================================================= */

// Send verification code to bind Gmail
export const sendEmailVerifyCode = async (email) => {
  await API.post("/notifications/email/bind", { gmail: email });
  return API.post("/notifications/email/send-code");
};

// Verify code and bind Gmail
export const verifyAndBindEmail = async (email, code) => {
  return API.post("/notifications/email/verify", { code });
};

// Update email notification settings
export const updateEmailNotifySettings = (settings) =>
  API.patch("/notifications/email/preferences", settings);

export default API;
