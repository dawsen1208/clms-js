// ✅ client/src/components/LayoutMenu.jsx
import { Layout, Menu, Button, Tooltip, Grid, Drawer, QRCode, Modal } from "antd";
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
  QrcodeOutlined,
} from "@ant-design/icons";
import { SettingOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
      // ✅ 触发同步登出广播
      localStorage.setItem("logout_event", Date.now());
      onLogout();
    } else {
      setCurrentPage(e.key);
      // ✅ 在详情页等子路由中点击菜单时，跳转到对应的页面路由
      if (e.key === "assistant") {
        navigate("/assistant");
      } else {
        // 其余读者页面统一在 /home 路由下通过 currentPage 切换
        navigate("/home");
      }
    }
  };

  /* =========================================================
     🧱 渲染组件结构
     ========================================================= */
  // 📱 Mobile Bottom Navigation
  const MobileBottomNav = () => (
    <div className="mobile-bottom-nav">
      <div 
        className={`mobile-nav-item ${currentPage === 'home' ? 'active' : ''}`}
        onClick={() => { setCurrentPage('home'); navigate('/home'); }}
      >
        <HomeOutlined className="nav-icon" />
        <span className="nav-label">{t("common.home")}</span>
      </div>
      <div 
        className={`mobile-nav-item ${currentPage === 'search' ? 'active' : ''}`}
        onClick={() => { setCurrentPage('search'); navigate('/search'); }}
      >
        <SearchOutlined className="nav-icon" />
        <span className="nav-label">{t("common.search")}</span>
      </div>
      <div 
        className={`mobile-nav-item ${currentPage === 'borrow' ? 'active' : ''}`}
        onClick={() => { setCurrentPage('borrow'); navigate('/borrow'); }}
      >
        <BookOutlined className="nav-icon" />
        <span className="nav-label">{t("common.myBooks")}</span>
      </div>
      <div 
        className={`mobile-nav-item ${currentPage === 'profile' ? 'active' : ''}`}
        onClick={() => { setCurrentPage('profile'); navigate('/profile'); }}
      >
        <UserOutlined className="nav-icon" />
        <span className="nav-label">{t("common.profile")}</span>
      </div>
      <div 
        className={`mobile-nav-item ${currentPage === 'settings' ? 'active' : ''}`}
        onClick={() => { setCurrentPage('settings'); navigate('/settings'); }}
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
            selectedKeys={[currentPage]}
            onClick={handleMenuClick}
            items={[
              { key: "home", icon: <HomeOutlined />, label: t("common.home") },
              { key: "assistant", icon: <RobotOutlined />, label: t("common.smartRec") }, // Using smartRec as proxy for Assistant or add new key. "Smart Assistant" isn't in translations yet.
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
          minHeight: "100vh",
          paddingBottom: isMobile ? "80px" : 0, // 📱 Prevent content from being hidden by bottom nav
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
            position: "sticky",
            top: 0,
            zIndex: 100,
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
            {/* 📱 Mobile Access QR Code (Desktop Only) */}
            {!isMobile && (
              <Tooltip title={t("login.scanToOpen")}>
                <Button 
                  type="primary"
                  ghost
                  icon={<QrcodeOutlined />} 
                  onClick={() => setQrModalOpen(true)}
                  style={{ 
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    height: "36px",
                    padding: "0 12px",
                    borderRadius: "18px",
                    border: "1px solid #1677ff",
                    background: "#e6f4ff",
                    boxShadow: "0 2px 6px rgba(22, 119, 255, 0.2)"
                  }}
                >
                  <span style={{ fontWeight: 500 }}>{t("mobile.experience")}</span>
                </Button>
              </Tooltip>
            )}

            {/* Global Notifier (Bell) */}
            <div style={{ display: "flex", alignItems: "center" }}>
              <GlobalNotifier />
            </div>
          </div>

          {/* 📱 QR Code Modal */}
          <Modal
            open={qrModalOpen}
            footer={null}
            onCancel={() => setQrModalOpen(false)}
            centered
            width={360}
            title={<div style={{ textAlign: "center" }}>📱 {t("mobile.experience")}</div>}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "20px 0" }}>
              <QRCode 
                value="https://clmsf5164136.z1.web.core.windows.net/" 
                size={250} 
                icon="https://gw.alipayobjects.com/zos/rmsportal/KDpgvguMpGfqaHPjicRK.svg" // Optional: Ant Design Logo or App Logo
                errorLevel="H"
              />
              <div style={{ marginTop: "24px", textAlign: "center", color: "#64748b" }}>
                <p style={{ margin: 0, fontWeight: 500 }}>{t("mobile.scanCamera")}</p>
                <p style={{ margin: "4px 0 0", fontSize: "13px" }}>{t("mobile.scanDesc")}</p>
              </div>
            </div>
          </Modal>
        </Header>

        {/* Main content area */}
        <Content
          style={{
            padding: isMobile ? "0" : "24px", // Remove padding on mobile to allow full width
            background: "#f0f2f5",
            minHeight: "calc(100vh - 64px)",
            transition: "all 0.3s ease",
            overflowX: "hidden"
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
          </div>
        </Content>

        {/* 📱 Render Mobile Bottom Nav */}
        {isMobile && <MobileBottomNav />}
      </Layout>
    </Layout>
  );
}

export default LayoutMenu;
