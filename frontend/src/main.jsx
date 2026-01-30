// ✅ client/src/main.jsx
import React, { useState, useEffect } from "react";
import { createRoot } from 'react-dom/client';
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { AccessibilityProvider } from "./contexts/AccessibilityContext";

import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";
import "./assets/responsive.css";
import "./styles/mobile.css";
import "./styles/global.css";
import { ConfigProvider, message, Grid, theme as antdTheme } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation
} from "react-router-dom";

// ✅ Global Components
import LayoutMenu from "./components/LayoutMenu";
import AdminMenu from "./components/AdminMenu";
import SettingsPage from "./pages/SettingsPage";

// ✅ Auth Pages
import LoginPage from "./pages/LoginPage";
import RegisterReader from "./pages/RegisterReader";
import RegisterAdmin from "./pages/RegisterAdmin";

// ✅ User Pages
import HomePage from "./pages/HomePage";
import SearchPage from "./pages/SearchPage";
import BorrowPage from "./pages/BorrowPage";
import ReturnPage from "./pages/ReturnPage";
import ProfilePage from "./pages/ProfilePage";
import SmartAssistant from "./pages/SmartAssistant";
import BookDetail from "./pages/BookDetail";
import FeedbackPage from "./pages/FeedbackPage";
import NotificationPage from "./pages/NotificationPage";

// ✅ Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminBookPage from "./pages/AdminBookPage";
import AdminBorrowPage from "./pages/AdminBorrowPage";
import AdminRequestPage from "./pages/AdminRequestPage";
import AdminBorrowHistory from "./pages/AdminBorrowHistory";
import AdminUserManagePage from "./pages/AdminUserManagePage";
import AdminFeedbackPage from "./pages/AdminFeedbackPage";
import AdminProfilePage from "./pages/AdminProfilePage";
import AdminSettingsPage from "./pages/AdminSettingsPage";

console.log("✅ main.jsx loaded");

// 🚫 强制注销 Service Worker 并清除缓存
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      registration.unregister();
      console.log('SW unregistered:', registration);
    }
  });
  // 尝试清除缓存 (Optional, careful with this in production if you rely on it for other things, but requested by user)
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (let name of names) {
        caches.delete(name);
        console.log('Cache deleted:', name);
      }
    });
  }
}

// 🏗️ 显示构建信息
if (typeof __BUILD_INFO__ !== 'undefined') {
  console.log(
    `%c Build Info %c ${__BUILD_INFO__.time} | v${__BUILD_INFO__.version} `,
    'background:#35495e ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff',
    'background:#41b883 ; padding: 1px; border-radius: 0 3px 3px 0;  color: #fff'
  );
}

const PrivateRoute = ({ children }) => {
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
};

function App() {
  const { language } = useLanguage();
  const [token, setToken] = useState(
    sessionStorage.getItem("token") || localStorage.getItem("token")
  );
  const [user, setUser] = useState(
    JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "{}")
  );

  const [appearance, setAppearance] = useState(() => {
    const fallback = {
      mode: "light",
      themeColor: "blue",
      customColor: "#1677FF",
      fontSize: "normal",
      highContrast: false,
    };

    try {
      const saved = localStorage.getItem("appearance_prefs");
      if (!saved) return fallback;

      const parsed = JSON.parse(saved) || {};
      const normalized = { ...fallback, ...parsed };

      if (typeof normalized.customColor !== "string") {
        normalized.customColor = fallback.customColor;
      }

      if (
        normalized.backgroundColor &&
        typeof normalized.backgroundColor !== "string"
      ) {
        normalized.backgroundColor = "";
      }

      const validModes = ["light", "dark"];
      if (!validModes.includes(normalized.mode)) {
        normalized.mode = fallback.mode;
      }

      const validThemeColors = ["blue", "purple", "green", "custom"];
      if (!validThemeColors.includes(normalized.themeColor)) {
        normalized.themeColor = fallback.themeColor;
      }

      // Allow number for custom font size, or fallback to legacy string validation
      if (typeof normalized.fontSize !== 'number') {
         const validFontSizes = ["normal", "large"];
         if (!validFontSizes.includes(normalized.fontSize)) {
           normalized.fontSize = fallback.fontSize;
         }
      }

      return normalized;
    } catch {
      return fallback;
    }
  });
  const navigate = useNavigate();
  const location = useLocation();
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
  
  // 📏 Font Size Logic: Support numeric or legacy string
  let baseFontSize;
  if (typeof appearance.fontSize === 'number') {
    baseFontSize = appearance.fontSize;
  } else {
    baseFontSize = appearance.fontSize === "large" ? (isMobile ? 15 : 16) : (isMobile ? 13 : 14);
  }

  const algorithm = isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm;

  // 🎨 Dynamic Background Logic
  const isHome = location.pathname === '/home' || location.pathname === '/';
  const customBg = (!isHome && appearance.backgroundColor) ? appearance.backgroundColor : null;

  // ♿ Accessibility Overrides
  useEffect(() => {
    // Apply Font Size to Body/Root for non-AntD content
    const root = document.documentElement;
    root.style.fontSize = `${baseFontSize}px`;
    document.body.style.fontSize = `${baseFontSize}px`;

    // Apply High Contrast Class
    if (appearance.highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [baseFontSize, appearance.highContrast]);

  const themeTokens = {
    colorPrimary: appearance.highContrast ? (isDark ? '#FFFF00' : '#0000CD') : resolvePrimary(),
    colorInfo: appearance.highContrast ? (isDark ? '#FFFF00' : '#0000CD') : resolvePrimary(),
    colorSuccess: appearance.highContrast ? '#00FF00' : '#52C41A',
    colorWarning: appearance.highContrast ? '#FFA500' : '#FAAD14',
    colorError: appearance.highContrast ? '#FF0000' : '#FF4D4F',
    colorText: appearance.highContrast ? (isDark ? '#FFFFFF' : '#000000') : (isDark ? '#E6E6E6' : '#1F2937'),
    colorTextSecondary: appearance.highContrast ? (isDark ? '#FFFFFF' : '#000000') : (isDark ? '#CFCFCF' : '#6B7280'),
    colorBgContainer: appearance.highContrast ? (isDark ? '#000000' : '#FFFFFF') : (isDark ? '#141414' : '#FFFFFF'),
    colorBgLayout: appearance.highContrast ? (isDark ? '#000000' : '#FFFFFF') : (customBg || (isDark ? '#0b0b0b' : '#F5F7FA')),
    colorBorder: appearance.highContrast ? (isDark ? '#FFFFFF' : '#000000') : '#E5EAF2',
    borderRadius: appearance.highContrast ? 0 : 12, // Remove radius for HC
    boxShadow: appearance.highContrast ? 'none' : '0 4px 12px rgba(0,0,0,0.08)',
    controlHeight: isMobile ? 32 : 36,
    controlPaddingHorizontal: isMobile ? 10 : 12,
    paddingXS: isMobile ? 6 : 8,
    paddingSM: isMobile ? 10 : 12,
    paddingMD: isMobile ? 14 : 16,
    paddingLG: isMobile ? 18 : 20,
    fontSize: baseFontSize,
    lineHeight: typeof appearance.fontSize === 'number' ? 1.5 : (appearance.fontSize === 'large' ? (isMobile ? 1.6 : 1.7) : (isMobile ? 1.5 : 1.6)),
    fontFamily: "'Segoe UI', 'Inter', sans-serif",
  };

  const locale = language === 'zh' ? zhCN : enUS;

  const handleLogin = (newToken, newUser) => {
    sessionStorage.setItem("token", newToken);
    sessionStorage.setItem("user", JSON.stringify(newUser));
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));

    setToken(newToken);
    setUser(newUser);
    message.success("Login successful! 🎉");

    if (newUser.role === "Administrator") {
      navigate("/admin/dashboard");
    } else {
      navigate("/home");
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // ✅ Clear user preferences to prevent cross-user pollution
    localStorage.removeItem("appearance_prefs");
    localStorage.removeItem("security_prefs");
    localStorage.removeItem("notification_prefs");
    localStorage.removeItem("operation_prefs");
    localStorage.removeItem("recommend_prefs");
    localStorage.removeItem("admin_approval_prefs");
    localStorage.removeItem("admin_permissions");

    setToken(null);
    setUser(null);
    navigate("/login");
    message.info("You have logged out safely.");
  };

  // ✅ Layout Wrappers
  const UserLayoutWrapper = ({ children }) => (
    <PrivateRoute>
      <LayoutMenu onLogout={handleLogout}>
        {children}
      </LayoutMenu>
    </PrivateRoute>
  );

  const AdminLayoutWrapper = ({ children }) => (
    <PrivateRoute>
      <AdminMenu onLogout={handleLogout}>
        {children}
      </AdminMenu>
    </PrivateRoute>
  );

  return (
    <LanguageProvider>
      <AccessibilityProvider>
        <ConfigProvider componentSize={isMobile ? "small" : "middle"} locale={enUS} theme={{ token: themeTokens, algorithm }}>
        <Routes>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
          <Route path="/register" element={<RegisterReader />} />
          <Route path="/register-admin" element={<RegisterAdmin />} />

          {/* ✅ User Routes */}
          <Route path="/home" element={<UserLayoutWrapper><HomePage /></UserLayoutWrapper>} />
          <Route path="/search" element={<UserLayoutWrapper><SearchPage /></UserLayoutWrapper>} />
          <Route path="/borrow" element={<UserLayoutWrapper><BorrowPage /></UserLayoutWrapper>} />
          <Route path="/return" element={<UserLayoutWrapper><ReturnPage /></UserLayoutWrapper>} />
          <Route path="/profile" element={<UserLayoutWrapper><ProfilePage user={user} /></UserLayoutWrapper>} />
          <Route path="/assistant" element={<UserLayoutWrapper><SmartAssistant /></UserLayoutWrapper>} />
          <Route path="/settings" element={<UserLayoutWrapper><SettingsPage appearance={appearance} onChange={setAppearance} user={user} onUserUpdate={setUser} /></UserLayoutWrapper>} />
          <Route path="/book/:id" element={<UserLayoutWrapper><BookDetail /></UserLayoutWrapper>} />
          <Route path="/feedback" element={<UserLayoutWrapper><FeedbackPage /></UserLayoutWrapper>} />
          <Route path="/notifications" element={<UserLayoutWrapper><NotificationPage /></UserLayoutWrapper>} />

          {/* ✅ Admin Routes */}
          <Route path="/admin/dashboard" element={<AdminLayoutWrapper><AdminDashboard /></AdminLayoutWrapper>} />
          <Route path="/admin/books" element={<AdminLayoutWrapper><AdminBookPage /></AdminLayoutWrapper>} />
          <Route path="/admin/borrow" element={<AdminLayoutWrapper><AdminBorrowPage /></AdminLayoutWrapper>} />
          <Route path="/admin/requests" element={<AdminLayoutWrapper><AdminRequestPage /></AdminLayoutWrapper>} />
          <Route path="/admin/history" element={<AdminLayoutWrapper><AdminBorrowHistory /></AdminLayoutWrapper>} />
          <Route path="/admin/users" element={<AdminLayoutWrapper><AdminUserManagePage /></AdminLayoutWrapper>} />
          <Route path="/admin/feedback" element={<AdminLayoutWrapper><AdminFeedbackPage /></AdminLayoutWrapper>} />
          <Route path="/admin/profile" element={<AdminLayoutWrapper><AdminProfilePage /></AdminLayoutWrapper>} />
          <Route path="/admin/settings" element={<AdminLayoutWrapper><AdminSettingsPage appearance={appearance} onChange={setAppearance} user={user} /></AdminLayoutWrapper>} />

          {/* ✅ Default Route */}
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
      </AccessibilityProvider>
    </LanguageProvider>
  );
}

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: '#ff4d4f', background: '#fff1f0', height: '100vh', overflow: 'auto' }}>
          <h2>📱 Mobile Debug Error</h2>
          <p style={{ fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <LanguageProvider>
        <AccessibilityProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AccessibilityProvider>
      </LanguageProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);
