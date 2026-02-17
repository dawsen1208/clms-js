// ✅ client/src/main.jsx
import React, { useState, useEffect } from "react";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { AccessibilityProvider } from "./contexts/AccessibilityContext";
import { ReadingThemeProvider } from "./theme/ReadingThemeContext";

import ReactDOM from "react-dom/client";
import "antd/dist/reset.css";
import "./assets/responsive.css";
import "./styles/mobile.css";
import "./styles/global.css";
import { appTheme } from "./theme";
import { ConfigProvider, message, Grid, theme as antdTheme } from "antd";
import enUS from "antd/locale/en_US";
import zhCN from "antd/locale/zh_CN";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";

import { Spin } from "antd";

const LayoutMenu = React.lazy(() => import("./layouts/LayoutMenu/LayoutMenu"));
const AdminMenu = React.lazy(() => import("./layouts/AdminMenu/AdminMenu"));
import { PublicRoutes, ReaderRoutes, AdminRoutes } from "./app/routes";
import BookWorldLayout from "./layouts/BookWorldLayout/BookWorldLayout";
import { MotionProvider } from "./motion/MotionProvider";

const PageLoading = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" tip="Loading..." />
  </div>
);

console.log("✅ main.jsx loaded - Version: 2025-01-30 Fix Double Provider & HandleUpdate");

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
  const [user, setUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [appearance, setAppearance] = useState(() => {
    const fallback = {
      mode: "light",
      themeColor: "blue",
      customColor: "#1677FF",
      fontSize: "normal",
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
    try {
      localStorage.setItem("appearance_prefs", JSON.stringify(appearance));
    } catch (err) {
      console.error("Failed to persist appearance prefs", err);
    }
  }, [appearance]);

  const resolvePrimary = () => {
    switch (appearance.themeColor) {
      case "blue": return "#BC6C25"; // Default Warm Bronze
      case "purple": return "#722ED1";
      case "green": return "#606C38"; // Warm Olive
      case "custom": return appearance.customColor || "#BC6C25";
      default: return "#BC6C25";
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

  // 🎨 Determine Algorithm
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
  }, [baseFontSize]);

  const themeTokens = {
    ...appTheme.token,
    colorPrimary: resolvePrimary(),
    colorInfo: resolvePrimary(),
    colorSuccess: '#52B788',
    colorWarning: '#E9C46A',
    colorError: '#E76F51',
    colorText: (isDark ? '#E6E6E6' : '#1C1917'),
    colorTextSecondary: (isDark ? '#CFCFCF' : '#4A4845'),
    colorTextTertiary: (isDark ? '#BFBFBF' : '#9C9893'),
    colorTextQuaternary: (isDark ? '#A6A6A6' : '#E6E2DD'),
    colorTextPlaceholder: (isDark ? '#6B7280' : '#9C9893'),
    colorBgContainer: (isDark ? '#141414' : '#FFFFFF'),
    colorBgLayout: (customBg || (isDark ? '#0b0b0b' : '#FDFBF7')),
    colorBgElevated: (isDark ? '#1f1f1f' : '#FFFFFF'),
    colorBgSpotlight: (isDark ? '#1f1f1f' : '#1C1917'),
    colorBorder: '#E6E2DD',
    colorBorderSecondary: '#F0F0F0',
    colorSplit: 'rgba(5, 5, 5, 0.06)',
    controlItemBgActive: (isDark ? '#111b26' : '#FEFAE0'),
    controlItemBgHover: (isDark ? '#303030' : '#F5F5F5'),
    colorIcon: (isDark ? '#E6E6E6' : '#4A4845'),
    colorIconHover: (isDark ? '#FFFFFF' : '#1C1917'),
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(188, 108, 37, 0.08)',
    controlHeight: isMobile ? 32 : 40,
    controlPaddingHorizontal: isMobile ? 10 : 12,
    paddingXS: isMobile ? 6 : 8,
    paddingSM: isMobile ? 10 : 12,
    paddingMD: isMobile ? 14 : 16,
    paddingLG: isMobile ? 18 : 20,
    fontSize: baseFontSize,
    lineHeight: typeof appearance.fontSize === 'number' ? 1.5 : (appearance.fontSize === 'large' ? (isMobile ? 1.6 : 1.7) : (isMobile ? 1.5 : 1.6)),
    fontFamily: "'Literata', 'Inter', 'Segoe UI', sans-serif",
    fontFamilyCode: "'Fira Code', monospace",
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
  const UserLayoutWrapper = ({ children, left, right }) => (
    <PrivateRoute>
      <BookWorldLayout left={left} right={right} onLogout={handleLogout}>
        {children}
      </BookWorldLayout>
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
    <ConfigProvider componentSize={isMobile ? "small" : "middle"} locale={locale} theme={{ token: themeTokens, algorithm, cssVar: true }}>
      <React.Suspense fallback={<PageLoading />}>
        <Routes>
          {PublicRoutes({ handleLogin })}
          {ReaderRoutes({
            UserLayoutWrapper,
            appearance,
            user,
            setAppearance,
            setUser,
          })}
          {AdminRoutes({
            AdminLayoutWrapper,
            appearance,
            setAppearance,
            user,
          })}
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
      </React.Suspense>
    </ConfigProvider>
  );
}

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: !!error };
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
          <ReadingThemeProvider>
            <BrowserRouter>
              <MotionProvider>
                <App />
              </MotionProvider>
            </BrowserRouter>
          </ReadingThemeProvider>
        </AccessibilityProvider>
      </LanguageProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);
