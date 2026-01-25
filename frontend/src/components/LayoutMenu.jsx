// ✅ client/src/components/LayoutMenu.jsx
import { Layout, Menu, Button, Tooltip, Grid, Drawer, Modal } from "antd";
import {
  MenuOutlined,
  HomeOutlined,
  SearchOutlined,
  BookOutlined,
  RollbackOutlined,
  UserOutlined,
  LogoutOutlined,
  RobotOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { SettingOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import GlobalNotifier from "./GlobalNotifier"; // ✅ 全局用户通知系统
import "./LayoutMenu.css"; // ✅ New CSS file for consistent styling
import { useLanguage } from "../contexts/LanguageContext";

const { Sider, Content, Header } = Layout;
// const { useBreakpoint } = Grid; // ❌ Moved inside component

/**
 * 📚 用户端主布局组件
 * - 左侧导航栏（主页、借阅、归还、智能助手等）
 * - 右侧主内容区
 * - 支持 sessionStorage 登录隔离 + 多标签页同步登出
 * - 内置全局通知（右上角铃铛）
 */
function LayoutMenu({ currentPage, setCurrentPage, onLogout, children }) {
  const { t } = useLanguage();
  const { useBreakpoint } = Grid; // ✅ Moved here
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false); // 📱 QR Code Modal state
  const [userName, setUserName] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const isMobile = !screens.md; // md 及以下视为移动端

  /* =========================================================
     🧩 获取当前用户信息（优先使用 sessionStorage）
     ========================================================= */
  useEffect(() => {
    const sessionUser = sessionStorage.getItem("user");
    const localUser = localStorage.getItem("user");
    const user = JSON.parse(sessionUser || localUser || "{}");
    if (user?.name) {
      setUserName(user.name);
    }

    // ✅ 多标签同步登出
    const handleStorage = (e) => {
      if (e.key === "logout_event") {
        onLogout?.();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // 移动端默认收起侧边栏
  useEffect(() => {
    if (isMobile) setCollapsed(true);
  }, [isMobile]);

  /* =========================================================
     📋 菜单点击事件
     ========================================================= */
  const handleMenuClick = (e) => {
    if (isMobile) setMobileMenuOpen(false);
    if (e.key === "logout") {
      localStorage.setItem("logout_event", Date.now());
      onLogout();
    } else {
      // ✅ 使用 React Router 导航
      switch (e.key) {
        case "home": navigate("/home"); break;
        case "search": navigate("/search"); break;
        case "borrow": navigate("/borrow"); break;
        case "return": navigate("/return"); break;
        case "profile": navigate("/profile"); break;
        case "assistant": navigate("/assistant"); break;
        case "settings": navigate("/settings"); break;
        default: navigate("/home");
      }
    }
  };

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes("/home")) return "home";
    if (path.includes("/search")) return "search";
    if (path.includes("/borrow")) return "borrow";
    if (path.includes("/return")) return "return";
    if (path.includes("/profile")) return "profile";
    if (path.includes("/assistant")) return "assistant";
    if (path.includes("/settings")) return "settings";
    return "home";
  };
  
  const currentKey = getSelectedKey();

  /* =========================================================
     🧱 渲染组件结构
     ========================================================= */
  // 📱 Mobile Bottom Navigation
  const MobileBottomNav = () => (
    <div className="mobile-bottom-nav">
      <div 
        className={`mobile-nav-item ${currentKey === 'home' ? 'active' : ''}`}
        onClick={() => navigate('/home')}
      >
        <HomeOutlined className="nav-icon" />
        <span className="nav-label">{t("common.home")}</span>
      </div>
      <div 
        className={`mobile-nav-item ${currentKey === 'search' ? 'active' : ''}`}
        onClick={() => navigate('/search')}
      >
        <SearchOutlined className="nav-icon" />
        <span className="nav-label">{t("common.search")}</span>
      </div>
      <div 
        className={`mobile-nav-item ${currentKey === 'borrow' ? 'active' : ''}`}
        onClick={() => navigate('/borrow')}
      >
        <BookOutlined className="nav-icon" />
        <span className="nav-label">{t("common.myBooks")}</span>
      </div>
      <div 
        className={`mobile-nav-item ${currentKey === 'profile' ? 'active' : ''}`}
        onClick={() => navigate('/profile')}
      >
        <UserOutlined className="nav-icon" />
        <span className="nav-label">{t("common.profile")}</span>
      </div>
      <div 
        className={`mobile-nav-item ${currentKey === 'settings' ? 'active' : ''}`}
        onClick={() => navigate('/settings')}
      >
        <SettingOutlined className="nav-icon" />
        <span className="nav-label">{t("common.settings")}</span>
      </div>
    </div>
  );

  const SidebarContent = (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {/* Header with user info */}
        <div className="user-sidebar-header">
          <div className="user-sidebar-header-content">
            <div className="user-avatar-circle">
              <UserOutlined style={{ fontSize: 24 }} />
            </div>
            {!collapsed && !isMobile && (
              <div className="user-info-text">
                <div className="user-role">{t("role.libraryReader")}</div>
              </div>
            )}
            {isMobile && (
              <div className="user-info-text">
                <div className="user-role">{t("role.libraryReader")}</div>
              </div>
            )}
          </div>
        </div>

        {/* Collapse toggle button (Desktop only) */}
        {!isMobile && (
          <div
            className="user-sidebar-collapse-btn"
            style={{
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              cursor: "pointer",
              margin: "8px 12px",
              borderRadius: 8,
            }}
            onClick={() => setCollapsed(!collapsed)}
          >
            <MenuOutlined style={{ fontSize: 18 }} />
          </div>
        )}

        {/* Main navigation menu */}
        <div className="user-app-menu" style={{ flexGrow: 1 }}>
          <Menu
            theme="dark"
            mode="inline"
            selectedKeys={[currentKey]}
            onClick={handleMenuClick}
            items={[
              { key: "home", icon: <HomeOutlined />, label: t("common.home") },
              { key: "assistant", icon: <RobotOutlined />, label: t("common.smartRec") }, 
              { key: "search", icon: <SearchOutlined />, label: t("common.search") },
              { key: "borrow", icon: <BookOutlined />, label: t("common.borrowManage") },
              { key: "return", icon: <RollbackOutlined />, label: t("common.returnSystem") },
              { key: "profile", icon: <UserOutlined />, label: t("common.profile") },
              { key: "settings", icon: <SettingOutlined />, label: t("common.settings") },
            ]}
            style={{ flexGrow: 1 }}
            className="user-menu-items"
          />
        </div>

        <div className="user-logout-menu">
          {/* Bottom logout button */}
          <Menu
            theme="dark"
            mode="inline"
            onClick={handleMenuClick}
            items={[
              {
                key: "logout",
                icon: <LogoutOutlined />,
                label: t("common.logout"),
              },
            ]}
            style={{
              borderTop: "1px solid rgba(255,255,255,0.15)",
              paddingBottom: "1rem",
            }}
          />
        </div>
    </div>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* ✅ Left sidebar navigation (Desktop) */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={200}
          collapsedWidth={80}
          breakpoint="md"
          className="user-app-sidebar"
          trigger={null} // Hide default trigger
          style={{
            background: "#001529",
            height: "100vh",
            position: "fixed",
            left: 0,
            top: 0,
            zIndex: 10,
          }}
        >
          {SidebarContent}
        </Sider>
      )}

      {/* ✅ Mobile Drawer Navigation */}
      {isMobile && (
        <Drawer
          placement="left"
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          width="75%"
          styles={{ body: { padding: 0, background: "#001529" } }}
          closeIcon={null}
        >
          {SidebarContent}
        </Drawer>
      )}

      {/* ✅ Right main content area */}
      <Layout
        style={{
          marginLeft: isMobile ? 0 : (collapsed ? 80 : 200),
          transition: "margin-left 0.3s ease",
          minHeight: "100dvh",
          // 📱 Mobile: Layout becomes a fixed container to allow independent content scrolling
          height: isMobile ? "100dvh" : "auto",
          overflow: isMobile ? "hidden" : "visible",
        }}
      >
        {/* ✅ Top Navigation Bar (Mobile & Desktop) */}
        <Header
          style={{
            padding: "0 16px",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: isMobile ? "none" : "0 2px 8px rgba(0,0,0,0.06)", // 📱 Cleaner mobile header
            borderBottom: isMobile ? "1px solid #f0f0f0" : "none",
            height: 64,
            // 📱 On mobile, Header is part of the fixed flex layout, so sticky is not needed (it stays at top)
            // On desktop, we keep sticky
            position: isMobile ? "relative" : "sticky",
            top: 0,
            zIndex: 100,
            flexShrink: 0, // Prevent header from shrinking
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Desktop Collapse Button */}
            {!isMobile && (
              <Button
                type="text"
                icon={collapsed ? <MenuOutlined /> : <MenuOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{ fontSize: "16px", width: 64, height: 64 }}
              />
            )}
            
            {/* Title */}
            <div style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "8px" }}>
              {isMobile && <img src="/icons/apple-icon-180.png" alt="Logo" style={{ width: 24, height: 24, borderRadius: 4 }} onError={(e) => e.target.style.display='none'} />}
              CLMS Library
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Global Notifier (Bell) */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <GlobalNotifier />
            </div>
          </div>
        </Header>

        {/* Main content area */}
        <Content
          id="page-content" // ✅ Identify as scroll container
          style={{
            padding: isMobile ? "0" : "24px", // Remove padding on mobile to allow full width
            background: "#f0f2f5",
            // 📱 Mobile: Independent scroll container
            height: isMobile ? "calc(100dvh - 64px)" : "calc(100dvh - 64px)", 
            overflowY: isMobile ? "auto" : "visible",
            overflowX: "hidden",
            transition: "all 0.3s ease",
            // 📱 Mobile: Add bottom padding for TabBar + Safe Area
            // 🔥 Increased padding to ensure content is not hidden behind floating browser bars or app tab bar
            paddingBottom: isMobile ? "calc(130px + env(safe-area-inset-bottom))" : 0,
            // 📱 Mobile: Ensure smooth scrolling and snap points work
            scrollPaddingBottom: isMobile ? "calc(130px + env(safe-area-inset-bottom))" : 0,
            WebkitOverflowScrolling: "touch", // Smooth scroll on iOS
          }}
        >
          <div className={isMobile ? "" : "page-container"}>
          {children || (
            <div
              style={{
                textAlign: "center",
                color: "#888",
                marginTop: "20vh",
                fontSize: "1rem",
              }}
            >
              ⚠️ {t("error.pageLoad")}
            </div>
          )}
          {/* 📱 Mobile: Optional Spacer as a backup */}
          {isMobile && <div style={{ height: "1px" }} />}
          </div>
        </Content>

        {/* 📱 Render Mobile Bottom Nav */}
        {isMobile && <MobileBottomNav />}
      </Layout>
    </Layout>
  );
}

export default LayoutMenu;
