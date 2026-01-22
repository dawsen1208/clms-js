// ✅ client/src/main.jsx
import React, { useState, useEffect } from "react";
import { unstableSetRender } from 'antd';
import { createRoot } from 'react-dom/client';

unstableSetRender((node, container) => {
  container._reactRoot ||= createRoot(container);
  const root = container._reactRoot;
  root.render(node);
  return async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    root.unmount();
  };
});
import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";
import "./assets/responsive.css";
import { ConfigProvider, message, Grid, theme as antdTheme } from "antd";
import enUS from "antd/locale/en_US";
import { registerSW } from 'virtual:pwa-register';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";

// ✅ 全局组件
import LayoutMenu from "./components/LayoutMenu";
import AdminMenu from "./components/AdminMenu";
import SettingsPage from "./pages/SettingsPage";

// ✅ 登录 / 注册页（恢复原有独立页面结构）
import LoginPage from "./pages/LoginPage";
import RegisterReader from "./pages/RegisterReader";
import RegisterAdmin from "./pages/RegisterAdmin";

// ✅ 普通用户功能页
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import BorrowPage from "./pages/BorrowPage";
import ReturnPage from "./pages/ReturnPage";
import ProfilePage from "./pages/ProfilePage";
import SmartAssistant from "./pages/SmartAssistant";
import BookDetail from "./pages/BookDetail";

// ✅ 管理员功能页
import AdminDashboard from "./pages/AdminDashboard";

console.log("✅ main.jsx loaded");

// 已移除弃用的 Modal.config，统一在具体 Modal 使用处设置属性

/* =========================================================
   🔒 登录保护组件：无 Token 自动跳转登录页
   ========================================================= */
const PrivateRoute = ({ children }) => {
  const token =
    sessionStorage.getItem("token") || localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
};

/* =========================================================
   🌍 主应用组件
   ========================================================= */
function App() {
  // ✅ 登录状态
  const [token, setToken] = useState(
    sessionStorage.getItem("token") || localStorage.getItem("token")
  );
  const [user, setUser] = useState(
    JSON.parse(
      sessionStorage.getItem("user") ||
        localStorage.getItem("user") ||
        "{}"
    )
  );
  const [currentPage, setCurrentPage] = useState("home");
  const [appearance, setAppearance] = useState(() => {
    try {
      const saved = localStorage.getItem("appearance_prefs");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      mode: "light",
      themeColor: "blue",
      customColor: "#1677FF",
      fontSize: "normal",
      highContrast: false,
    };
  });
  const navigate = useNavigate();
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  useEffect(() => {
    try { localStorage.setItem("appearance_prefs", JSON.stringify(appearance)); } catch {}
  }, [appearance]);

  const resolvePrimary = () => {
    switch (appearance.themeColor) {
      case "blue": return "#1677FF";
      case "purple": return "#722ED1";
      case "green": return "#52C41A";
      case "custom": return appearance.customColor || "#1677FF";
      default: return "#1677FF";
    }
  };

  const isDark = appearance.mode === "dark";
  const baseFontSize = appearance.fontSize === "large" ? (isMobile ? 15 : 16) : (isMobile ? 13 : 14);
  const algorithm = isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;

  const themeTokens = {
    colorPrimary: resolvePrimary(),
    colorInfo: resolvePrimary(),
    colorSuccess: '#52C41A',
    colorWarning: '#FAAD14',
    colorError: '#FF4D4F',
    colorText: appearance.highContrast ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#E6E6E6' : '#1F2937'),
    colorTextSecondary: appearance.highContrast ? (isDark ? '#ffffff' : '#000000') : (isDark ? '#CFCFCF' : '#6B7280'),
    colorBgContainer: isDark ? '#141414' : '#FFFFFF',
    colorBgLayout: isDark ? '#0b0b0b' : '#F5F7FA',
    colorBorder: appearance.highContrast ? (isDark ? '#ffffff' : '#000000') : '#E5EAF2',

    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',

    controlHeight: isMobile ? 32 : 36,
    controlPaddingHorizontal: isMobile ? 10 : 12,
    paddingXS: isMobile ? 6 : 8,
    paddingSM: isMobile ? 10 : 12,
    paddingMD: isMobile ? 14 : 16,
    paddingLG: isMobile ? 18 : 20,
    fontSize: baseFontSize,
    lineHeight: appearance.fontSize === 'large' ? (isMobile ? 1.6 : 1.7) : (isMobile ? 1.5 : 1.6),
    fontFamily: "'Segoe UI', 'Inter', sans-serif",
  };


  /* =========================================================
     ✅ 登录逻辑（由 LoginPage 回调触发）
     ========================================================= */
  const handleLogin = (newToken, newUser) => {
    // ✅ 存储登录状态（sessionStorage 优先）
    sessionStorage.setItem("token", newToken);
    sessionStorage.setItem("user", JSON.stringify(newUser));
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
    message.success("Login successful! 🎉");

    // ✅ 跳转不同主页
    if (newUser.role === "Administrator") {
      navigate("/admin/dashboard");
    } else {
      navigate("/home");
    }
  };

  /* =========================================================
     🚪 登出逻辑（彻底清空所有存储）
     ========================================================= */
  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setToken(null);
    setUser(null);
    navigate("/login");
    message.info("You have logged out safely.");
  };

  /* =========================================================
     📖 普通读者页面导航逻辑
     ========================================================= */
  const renderReaderPage = () => {
    switch (currentPage) {
      case "home":
        return <HomePage />;
      case "search":
        return <SearchPage />;
      case "borrow":
        return <BorrowPage />;
      case "return":
        return <ReturnPage />;
      case "profile":
        return <ProfilePage user={user} />;
      case "assistant":
        return <SmartAssistant />;
      case "settings":
        return <SettingsPage appearance={appearance} onChange={setAppearance} user={user} />;
      default:
        return <HomePage />;
    }
  };

  /* =========================================================
     🧱 路由结构
     ========================================================= */
  return (
    <ConfigProvider componentSize={isMobile ? "small" : "middle"} locale={enUS} theme={{ token: themeTokens, algorithm }}>
      <Routes>
        {/* 🧾 登录 / 注册页（旧结构恢复） */}
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="/register" element={<RegisterReader />} />
        <Route path="/register-admin" element={<RegisterAdmin />} />

        {/* 📚 读者端受保护页面 */}
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <LayoutMenu
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                onLogout={handleLogout}
              >
                {renderReaderPage()}
              </LayoutMenu>
            </PrivateRoute>
          }
        />

        {/* 🤖 智能助手页 */}
        <Route
          path="/assistant"
          element={
            <PrivateRoute>
              <LayoutMenu
                currentPage="assistant"
                setCurrentPage={setCurrentPage}
                onLogout={handleLogout}
              >
                <SmartAssistant />
              </LayoutMenu>
            </PrivateRoute>
          }
        />


        {/* 📖 书籍详情页（读者端） */}
        <Route
          path="/book/:id"
          element={
            <PrivateRoute>
              <LayoutMenu
                currentPage={currentPage}
                setCurrentPage={setCurrentPage}
                onLogout={handleLogout}
              >
                <BookDetail />
              </LayoutMenu>
            </PrivateRoute>
          }
        />

        {/* 🧑‍💼 管理员控制台 */}
        <Route
          path="/admin/dashboard"
          element={
            <PrivateRoute>
              <AdminMenu onLogout={handleLogout}>
                <AdminDashboard />
              </AdminMenu>
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <PrivateRoute>
              <AdminMenu onLogout={handleLogout}>
                <SettingsPage appearance={appearance} onChange={setAppearance} user={user} />
              </AdminMenu>
            </PrivateRoute>
          }
        />

        {/* 🚀 默认路由 */}
        <Route
          path="*"
          element={
            token ? (
              user?.role === "Administrator" ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <Navigate to="/home" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </ConfigProvider>
  );
}

/* =========================================================
   🚀 启动 React 应用渲染
   ========================================================= */
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// ✅ 注册 Service Worker（仅生产环境，避免开发时缓存导致空白页）
if (import.meta.env.PROD) {
  registerSW({ immediate: true });
}
