// ✅ client/src/components/AdminMenu.jsx
import React, { useState, useEffect } from "react";
import { Layout, Menu, Card, Typography, message, Grid, Button, Tooltip } from "antd";
import {
  MenuOutlined,
  HomeOutlined,
  BookOutlined,
  DatabaseOutlined,
  HistoryOutlined,
  TeamOutlined,
  UserOutlined,
  LogoutOutlined,
  DashboardOutlined,
  BarChartOutlined,
  SettingOutlined,
} from "@ant-design/icons";

// ✅ 导入页面组件
import AdminBookPage from "../pages/AdminBookPage";
import AdminBorrowPage from "../pages/AdminBorrowPage";
import AdminBorrowHistory from "../pages/AdminBorrowHistory";
import AdminUserManagePage from "../pages/AdminUserManagePage";
import AdminProfilePage from "../pages/AdminProfilePage"; // ✅ 新增
import AdminDashboard from "../pages/AdminDashboard";
import AdminNotifier from "./AdminNotifier";
import { theme, themeUtils } from "../styles/theme";
import "./AdminMenu.css"; // Custom styles for app-like menu

const { Sider, Content } = Layout;
const { Title, Paragraph } = Typography;
const { useBreakpoint } = Grid;

function AdminMenu({ onLogout, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected] = useState("home");
  const [adminName, setAdminName] = useState("Administrator");
  const screens = useBreakpoint();
  const isMobile = !screens.md;
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
        message.warning("Admin information not detected, please log in again");
        onLogout?.();
      }
      try {
        const raw = localStorage.getItem("admin_permissions");
        const map = raw ? JSON.parse(raw) : {};
        const key = user?.userId || user?.email || user?.name || "";
        const mods = map[key]?.modules || null;
        setAllowed(mods);
        if (Array.isArray(mods) && mods.length > 0 && !mods.includes("home")) {
          setSelected(mods[0]);
        }
      } catch {}
    } catch {
      onLogout?.();
    }

    // ✅ 跨标签页同步登出
    const syncLogout = (e) => {
      if (e.key === "logout_event") onLogout?.();
    };
    window.addEventListener("storage", syncLogout);
    return () => window.removeEventListener("storage", syncLogout);
  }, []);

  // 移动端默认收起侧边栏
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
        message.warning("You do not have permission to access this module");
        return;
      }
      setSelected(e.key);
    }
  };

  /* =========================================================
     🧱 内容渲染逻辑
     ========================================================= */
  const renderContent = () => {
    if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(selected)) {
      return (
        <div style={{ padding: 24 }}>
          <Typography.Text type="danger">Permission denied for this module</Typography.Text>
        </div>
      );
    }
    switch (selected) {
      case "book":
        return <AdminBookPage />;
      case "borrow":
        return <AdminBorrowPage />;
      case "history":
        return <AdminBorrowHistory />;
      case "users":
        return <AdminUserManagePage />;
      case "profile":
        // ✅ 显示管理员个人主页（申请处理页面）
        return <AdminProfilePage />;
      case "home":
        return children ? children : <AdminDashboard />;
      case "settings":
        return children ? children : <SettingsPage />;
      default:
        return children ? children : <AdminDashboard />;
    }
  };

  /* =========================================================
     🧩 渲染整体布局 - Netflix style sidebar
     ========================================================= */
  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* ✅ Netflix-style Left sidebar navigation */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={240}
        collapsedWidth={isMobile ? 0 : 80}
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
        {/* Netflix-style Logo Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <DashboardOutlined className="sidebar-logo-icon" />
            {!collapsed && <span>Library Admin</span>}
          </div>
        </div>

        {/* Enhanced collapse button */}
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

        {/* Netflix-style Main menu */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selected]}
          onClick={handleMenuClick}
          items={(Array.isArray(allowed) && allowed.length > 0 ? [
            { 
              key: "home", 
              icon: <DashboardOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Dashboard</span>
            },
            { 
              key: "book", 
              icon: <BookOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Books</span>
            },
            { 
              key: "borrow", 
              icon: <DatabaseOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Borrow</span>
            },
            { 
              key: "history", 
              icon: <HistoryOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>History</span>
            },
            { 
              key: "users", 
              icon: <TeamOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Users</span>
            },
            { 
              key: "profile", 
              icon: <UserOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Profile</span>
            },
          ].filter(i => allowed.includes(i.key)) : [
            { 
              key: "home", 
              icon: <DashboardOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Dashboard</span>
            },
            { 
              key: "book", 
              icon: <BookOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Books</span>
            },
            { 
              key: "borrow", 
              icon: <DatabaseOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Borrow</span>
            },
            { 
              key: "history", 
              icon: <HistoryOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>History</span>
            },
            { 
              key: "users", 
              icon: <TeamOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Users</span>
            },
            { 
              key: "profile", 
              icon: <UserOutlined style={{ fontSize: '18px' }} />, 
              label: <span style={{ fontSize: '14px', fontWeight: 500 }}>Profile</span>
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

        {/* Netflix-style Logout section */}
        <Menu
          theme="dark"
          mode="inline"
          onClick={handleMenuClick}
          items={[
            {
              key: "logout",
              icon: <LogoutOutlined style={{ color: "#ff4d4f", fontSize: '18px' }} />,
              label: <span style={{ color: "#ff4d4f", fontSize: '14px', fontWeight: 500 }}>Logout</span>,
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

      {/* ✅ Main content area + notification system */}
      <Layout
        style={{
          marginLeft: isMobile ? 0 : (collapsed ? 80 : 240), // Updated width from 200 to 240
          transition: "margin-left 0.3s ease",
        }}
      >
        {/* Mobile menu toggle */}
        {isMobile && (
          <div style={{ position: "fixed", top: 18, left: 18, zIndex: 2000 }}>
            <Tooltip title={collapsed ? "打开菜单" : "收起菜单"}>
              <Button
                shape="circle"
                icon={<MenuOutlined style={{ fontSize: 18 }} />}
                onClick={() => setCollapsed(!collapsed)}
              />
            </Tooltip>
          </div>
        )}
        {/* 🔔 管理员通知系统 */}
        <AdminNotifier />

        <Content
          style={{
            padding: isMobile ? "1rem" : "2rem",
            background: "#fff",
            minHeight: "100vh",
          }}
        >
          <div className="page-container">
            {renderContent()}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

export default AdminMenu;
