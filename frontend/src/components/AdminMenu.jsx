import React, { useState, useEffect } from "react";
import { Layout, Menu, Typography, message, Grid, Button, Tooltip, theme } from "antd";
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
import { useLocation, useNavigate } from "react-router-dom";

import AdminNotifier from "./AdminNotifier";
import "./AdminMenu.css";
import { useLanguage } from "../contexts/LanguageContext";

const { Sider, Content } = Layout;

function AdminMenu({ onLogout, children }) {
  const { useBreakpoint } = Grid;
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [collapsed, setCollapsed] = useState(false);
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const navigate = useNavigate();
  const location = useLocation();

  // Determine selected key from URL
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
  const [allowed, setAllowed] = useState(null);

  useEffect(() => {
    const sessionUser = sessionStorage.getItem("user");
    const localUser = localStorage.getItem("user");

    try {
      const user = JSON.parse(sessionUser || localUser || "{}");
      if (!user?.name) {
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

  const handleMenuClick = ({ key }) => {
    if (key === "logout") {
      window.localStorage.setItem("logout_event", Date.now());
      onLogout?.();
    } else {
      if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(key)) {
        message.warning(t("admin.noPermission"));
        return;
      }
      switch (key) {
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

  const allMenuItems = [
    { key: "home", icon: <DashboardOutlined />, label: t("admin.dashboard") },
    { key: "book", icon: <BookOutlined />, label: t("admin.bookManage") },
    { key: "requests", icon: <DatabaseOutlined />, label: t("admin.applicationManagement") || "App Mgmt" },
    { key: "borrow", icon: <DatabaseOutlined />, label: t("admin.borrowManagement") || "Borrow Mgmt" },
    { key: "history", icon: <HistoryOutlined />, label: t("admin.history") },
    { key: "users", icon: <TeamOutlined />, label: t("admin.userManage") },
    { key: "feedback", icon: <MessageOutlined />, label: t("feedback.adminTitle") },
    { key: "profile", icon: <UserOutlined />, label: t("common.profile") },
    { key: "settings", icon: <SettingOutlined />, label: t("common.settings") },
  ];

  const menuItems = Array.isArray(allowed) && allowed.length > 0
    ? allMenuItems.filter(i => allowed.includes(i.key))
    : allMenuItems;

  // Mobile Bottom Navigation
  const MobileBottomNav = () => {
    const navItems = [
      { key: "home", icon: <DashboardOutlined />, label: t("admin.dashboard") },
      { key: "book", icon: <BookOutlined />, label: t("admin.bookManage") },
      { key: "requests", icon: <DatabaseOutlined />, label: "App Mgmt" },
      { key: "users", icon: <TeamOutlined />, label: t("admin.userManage") },
      { key: "profile", icon: <UserOutlined />, label: "Profile" },
    ];

    const filteredItems = allowed 
      ? navItems.filter(item => allowed.includes(item.key) || item.key === 'home' || item.key === 'profile') 
      : navItems;

    return (
      <div className="mobile-bottom-nav" style={{ 
        background: 'rgba(253,251,247,0.95)', // Warmer background
        backdropFilter: 'blur(12px)',
        borderTop: `1px solid ${token.colorBorderSecondary}`,
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'space-around',
        padding: '8px 0',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}>
        {filteredItems.map(item => (
          <div 
            key={item.key}
            className={`mobile-nav-item ${selected === item.key ? 'active' : ''}`}
            onClick={() => handleMenuClick({ key: item.key })}
            style={{ 
              color: selected === item.key ? token.colorPrimary : token.colorTextSecondary,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              fontSize: 10,
              gap: 4
            }}
          >
            {React.cloneElement(item.icon, { style: { fontSize: 20 } })}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Layout style={{ minHeight: "100vh", background: 'transparent' }}>
      {!isMobile && (
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}
        collapsedWidth={80}
        breakpoint="md"
        theme="light"
        style={{
          background: 'rgba(253,251,247,0.85)', // Warmer background
          backdropFilter: 'blur(20px)',
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          display: "flex",
          flexDirection: "column",
          zIndex: 100,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: '2px 0 8px rgba(0,0,0,0.02)'
        }}
        className="app-sidebar"
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 24px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorWarning})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 18,
            fontFamily: "'Literata', serif",
            flexShrink: 0
          }}>A</div>
          {!collapsed && (
            <span style={{ 
              marginLeft: 12, 
              fontWeight: 700, 
              fontSize: 20, 
              color: token.colorTextHeading,
              fontFamily: "'Literata', serif",
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              CLMS Admin
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', paddingTop: 16 }}>
          <Menu
            mode="inline"
            selectedKeys={[selected]}
            onClick={handleMenuClick}
            items={menuItems}
            style={{ 
              background: 'transparent',
              border: 'none',
            }}
            className="app-like-menu"
          />
        </div>

        <div style={{ padding: 16, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
           <Button 
             block 
             icon={<LogoutOutlined />} 
             danger 
             type="text" 
             onClick={onLogout}
             style={{ 
               display: 'flex', 
               alignItems: 'center', 
               justifyContent: collapsed ? 'center' : 'flex-start',
               height: 44
             }}
           >
             {!collapsed && t("common.logout")}
           </Button>
        </div>
      </Sider>
      )}

      <Layout
        style={{
          marginLeft: isMobile ? 0 : (collapsed ? 80 : 260),
          transition: "margin-left 0.2s ease",
          paddingBottom: isMobile ? "80px" : 0,
          background: 'transparent'
        }}
      >
        <AdminNotifier />

        <Content
          style={{
            padding: 0,
            minHeight: "100vh",
            paddingBottom: 'env(safe-area-inset-bottom)'
          }}
        >
          {children}
        </Content>
        {isMobile && <MobileBottomNav />}
      </Layout>
    </Layout>
  );
}

export default AdminMenu;
