// ✅ client/src/components/AdminMenu.jsx
import React, { useState, useEffect } from "react";
import { Layout, Menu, Typography, message, Grid, Button, Tooltip } from "antd";
import {
  MenuOutlined,
  BookOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  TeamOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  SettingOutlined,
  MessageOutlined
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom"; // ✅ Added router hooks

import AdminNotifier from "./AdminNotifier";
import { theme } from "../styles/theme";
import "./AdminMenu.css";
import { useLanguage } from "../contexts/LanguageContext";

const { Sider, Content } = Layout;

function AdminMenu({ onLogout, children }) {
  const { useBreakpoint } = Grid; // ✅ Moved inside component
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Determine selected key from URL
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes("/admin/dashboard")) return "home";
    if (path.includes("/admin/books")) return "book";
    if (path.includes("/admin/requests")) return "requests";
    if (path.includes("/admin/borrow")) return "borrow";
    if (path.includes("/admin/history")) return "history";
    if (path.includes("/admin/users")) return "users";
    if (path.includes("/admin/feedback")) return "feedback";
    if (path.includes("/admin/profile")) return "profile";
    if (path.includes("/admin/settings")) return "settings";
    return "home";
  };

  const selected = getSelectedKey();
  const [adminName, setAdminName] = useState("Administrator");
  const [allowed, setAllowed] = useState(null);

  /* =========================================================
     🧩 初始化管理员信息
     ========================================================= */
  useEffect(() => {
    const sessionUser = sessionStorage.getItem("user");
    const localUser = localStorage.getItem("user");

    try {
      const user = JSON.parse(sessionUser || localUser || "{}");
      if (user?.name) {
        setAdminName(user.name);
      } else {
        message.warning(t("admin.adminInfoMissing"));
        onLogout?.();
      }
      try {
        const raw = localStorage.getItem("admin_permissions");
        const map = raw ? JSON.parse(raw) : {};
        const key = user?.userId || user?.email || user?.name || "";
        const mods = map[key]?.modules || null;
        setAllowed(mods);
      } catch {}
    } catch {
      onLogout?.();
    }

    const syncLogout = (e) => {
      if (e.key === "logout_event") onLogout?.();
    };
    window.addEventListener("storage", syncLogout);
    return () => window.removeEventListener("storage", syncLogout);
  }, [onLogout, t]);

  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  /* =========================================================
     📋 菜单点击事件
     ========================================================= */
  const handleMenuClick = (e) => {
    if (e.key === "logout") {
      window.localStorage.setItem("logout_event", Date.now());
      onLogout?.();
    } else {
      if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(e.key)) {
        message.warning(t("admin.noPermission"));
        return;
      }
      // ✅ Navigation Logic
      switch (e.key) {
        case "home": navigate("/admin/dashboard"); break;
        case "book": navigate("/admin/books"); break;
        case "requests": navigate("/admin/requests"); break;
        case "borrow": navigate("/admin/borrow"); break;
        case "history": navigate("/admin/history"); break;
        case "users": navigate("/admin/users"); break;
        case "feedback": navigate("/admin/feedback"); break;
        case "profile": navigate("/admin/profile"); break;
        case "settings": navigate("/admin/settings"); break;
        default: navigate("/admin/dashboard");
      }
    }
  };

  // 📱 Mobile Bottom Navigation
  const MobileBottomNav = () => {
    const navItems = [
      { key: "home", icon: <DashboardOutlined />, label: t("admin.dashboard") },
      { key: "book", icon: <BookOutlined />, label: t("admin.bookManage") },
      { key: "requests", icon: <DatabaseOutlined />, label: t("admin.applicationManagement") || "App Mgmt" },
      { key: "borrow", icon: <DatabaseOutlined />, label: t("admin.borrowManagement") || "Borrow Mgmt" },
      { key: "users", icon: <TeamOutlined />, label: t("admin.userManage") },
      { key: "feedback", icon: <MessageOutlined />, label: t("feedback.title") },
      { key: "profile", icon: <UserOutlined />, label: t("common.profile") },
      { key: "settings", icon: <SettingOutlined />, label: t("common.settings") },
    ];

    // Filter items based on allowed permissions if set
    const filteredItems = allowed 
      ? navItems.filter(item => allowed.includes(item.key) || item.key === 'home' || item.key === 'profile' || item.key === 'settings') 
      : navItems;

    return (
      <div className="mobile-bottom-nav">
        {filteredItems.map(item => (
          <div 
            key={item.key}
            className={`mobile-nav-item ${selected === item.key ? 'active' : ''}`}
            onClick={() => handleMenuClick({ key: item.key })}
          >
            {React.cloneElement(item.icon, { className: "nav-icon" })}
            <span className="nav-label">{item.label}</span>
          </div>
        ))}
      </div>
    );
  };

  /* =========================================================
     🧩 渲染整体布局
     ========================================================= */
  return (
    <Layout style={{ minHeight: "100vh" }}>
      {!isMobile && (
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={240}
        collapsedWidth={80}
        breakpoint="md"
        style={{
          background: '#001528',
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          zIndex: 10,
          boxShadow: theme.shadows.xl,
        }}
        className="app-sidebar"
      >
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <DashboardOutlined className="sidebar-logo-icon" />
            {!collapsed && <span>{t("bookDetail.libraryAdmin")}</span>}
          </div>
        </div>

        <div
          className="sidebar-collapse-btn"
          style={{
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            cursor: "pointer",
            margin: "8px 12px",
            borderRadius: "8px",
          }}
          onClick={() => setCollapsed(!collapsed)}
        >
          <MenuOutlined style={{ fontSize: 18 }} />
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selected]}
          onClick={handleMenuClick}
          items={(Array.isArray(allowed) && allowed.length > 0 ? [
            { 
              key: "home", 
              icon: <DashboardOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("admin.dashboard")}</span>
            },
            { 
              key: "book", 
              icon: <BookOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("admin.bookManage")}</span>
            },
            { 
              key: "requests", 
              icon: <DatabaseOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("admin.applicationManagement") || "Application Mgmt"}</span>
            },
            { 
              key: "borrow", 
              icon: <DatabaseOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("admin.borrowManagement") || "Borrow Mgmt"}</span>
            },
            { 
              key: "history", 
              icon: <HistoryOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("admin.history")}</span>
            },
            { 
              key: "users", 
              icon: <TeamOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("admin.userManage")}</span>
            },
            { 
              key: "feedback", 
              icon: <MessageOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("feedback.title")}</span>
            },
            { 
              key: "profile", 
              icon: <UserOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("common.profile")}</span>
            },
            { 
              key: "settings", 
              icon: <SettingOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("common.settings")}</span>
            },
          ].filter(i => allowed.includes(i.key)) : [
            { 
              key: "home", 
              icon: <DashboardOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("admin.dashboard")}</span>
            },
            { 
              key: "book", 
              icon: <BookOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("admin.bookManage")}</span>
            },
            { 
              key: "requests", 
              icon: <DatabaseOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("admin.applicationManagement") || "Application Mgmt"}</span>
            },
            { 
              key: "borrow", 
              icon: <DatabaseOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("admin.borrowManagement") || "Borrow Mgmt"}</span>
            },
            { 
              key: "history", 
              icon: <HistoryOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("admin.history")}</span>
            },
            { 
              key: "users", 
              icon: <TeamOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("admin.userManage")}</span>
            },
            { 
              key: "feedback", 
              icon: <MessageOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("feedback.title")}</span>
            },
            { 
              key: "profile", 
              icon: <UserOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("common.profile")}</span>
            },
            { 
              key: "settings", 
              icon: <SettingOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>{t("common.settings")}</span>
            },
          ])}
          style={{ 
            flexGrow: 1,
            background: 'transparent',
            border: 'none',
            padding: '8px 0'
          }}
          className="app-like-menu"
        />

        <Menu
          theme="dark"
          mode="inline"
          onClick={handleMenuClick}
          items={[
            {
              key: "logout",
              icon: <LogoutOutlined style={{ color: "#ff4d4f", fontSize: '18px' }} />,
              label: <span style={{ color: "#ff4d4f", fontSize: '14px', fontWeight: 500 }}>{t("common.logout")}</span>,
            },
          ]}
          style={{
            borderTop: "1px solid rgba(255,255,255,0.15)",
            paddingBottom: "1rem",
            background: 'transparent',
            border: 'none',
          }}
          className="logout-menu"
        />
      </Sider>
      )}

      <Layout
        style={{
          marginLeft: isMobile ? 0 : (collapsed ? 80 : 240),
          transition: "margin-left 0.3s ease",
          paddingBottom: isMobile ? "80px" : 0,
        }}
      >
        <AdminNotifier />

        <Content
          style={{
            padding: isMobile ? "1rem" : "2rem",
            background: "#fff",
            minHeight: "100vh",
          }}
        >
          <div className="page-container">
            {children}
          </div>
        </Content>
        {isMobile && <MobileBottomNav />}
      </Layout>
    </Layout>
  );
}

export default AdminMenu;
