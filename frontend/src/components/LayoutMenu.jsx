import React, { useState, useEffect } from "react";
import { Layout, Menu, Button, Dropdown, Avatar, Input, Badge, Space, Drawer, Typography, theme } from "antd";
import {
  HomeOutlined,
  SearchOutlined,
  BookOutlined,
  RollbackOutlined,
  UserOutlined,
  LogoutOutlined,
  RobotOutlined,
  SettingOutlined,
  MessageOutlined,
  BellOutlined,
  MenuOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HistoryOutlined
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import GlobalNotifier from "./GlobalNotifier";
import { motion } from "framer-motion";
import "./LayoutMenu.css";

const { Sider, Content, Header } = Layout;
const { Title, Text } = Typography;

const LayoutMenu = ({ onLogout, children }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [user, setUser] = useState({});

  useEffect(() => {
    const sessionUser = sessionStorage.getItem("user");
    const localUser = localStorage.getItem("user");
    setUser(JSON.parse(sessionUser || localUser || "{}"));
  }, []);

  const menuItems = [
    { key: "home", icon: <HomeOutlined />, label: t("titles.stats") || "Home" },
    { key: "search", icon: <SearchOutlined />, label: t("common.bookSearch") || "Search" },
    { key: "borrow", icon: <BookOutlined />, label: t("common.borrowManage") || "My Library" },
    { key: "return", icon: <HistoryOutlined />, label: "借阅记录" },
    { key: "assistant", icon: <RobotOutlined />, label: t("titles.smartAssistant") || "Assistant" },
    { type: 'divider' },
    { key: "profile", icon: <UserOutlined />, label: t("common.profile") || "Profile" },
    { key: "feedback", icon: <MessageOutlined />, label: t("common.feedback") || "Feedback" },
    { key: "settings", icon: <SettingOutlined />, label: t("common.settings") || "Settings" },
  ];

  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.includes("/home")) return "home";
    if (path.includes("/search")) return "search";
    if (path.includes("/borrow")) return "borrow";
    if (path.includes("/return")) return "return";
    if (path.includes("/profile")) return "profile";
    if (path.includes("/assistant")) return "assistant";
    if (path.includes("/feedback")) return "feedback";
    if (path.includes("/settings")) return "settings";
    return "home";
  };

  const handleMenuClick = ({ key }) => {
    setMobileDrawerOpen(false);
    if (key === "logout") {
      onLogout();
    } else {
      navigate(`/${key}`);
    }
  };

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />} onClick={() => navigate('/profile')}>
        Profile
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />} onClick={() => navigate('/settings')}>
        Settings
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} danger onClick={onLogout}>
        Logout
      </Menu.Item>
    </Menu>
  );

  const Logo = () => (
    <div style={{ 
      height: 64, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: collapsed ? 'center' : 'flex-start',
      padding: collapsed ? 0 : '0 24px',
      borderBottom: '1px solid rgba(0,0,0,0.06)'
    }}>
      <div style={{ 
        width: 32, 
        height: 32, 
        background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', 
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 18
      }}>
        C
      </div>
      {!collapsed && (
        <span style={{ marginLeft: 12, fontWeight: 700, fontSize: 18, color: '#1f1f1f' }}>
          CLMS
        </span>
      )}
    </div>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Desktop Sidebar */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={260}
        theme="light"
        className="desktop-sider"
        style={{
          borderRight: '1px solid rgba(0,0,0,0.06)',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          display: { xs: 'none', md: 'block' } // Handled by CSS media query
        }}
      >
        <Logo />
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 64px)' }}>
          <div style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
            <Menu
              mode="inline"
              selectedKeys={[getSelectedKey()]}
              items={menuItems}
              onClick={handleMenuClick}
              style={{ border: 'none' }}
              className="custom-menu"
            />
          </div>
          <div style={{ padding: 16, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
             {!collapsed ? (
                <Button 
                  block 
                  icon={<LogoutOutlined />} 
                  onClick={onLogout}
                  type="text"
                  danger
                  style={{ textAlign: 'left' }}
                >
                  Logout
                </Button>
             ) : (
               <Button 
                  type="text" 
                  danger 
                  icon={<LogoutOutlined />} 
                  onClick={onLogout} 
                  style={{ width: '100%', display: 'flex', justifyContent: 'center' }} 
               />
             )}
          </div>
        </div>
      </Sider>

      {/* Mobile Drawer */}
      <Drawer
        placement="left"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        styles={{ body: { padding: 0 } }}
        width={260}
      >
        <Logo />
        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ border: 'none' }}
        />
      </Drawer>

      <Layout style={{ marginLeft: collapsed ? 80 : 260, transition: 'margin-left 0.2s' }} className="site-layout">
        <Header style={{ 
          padding: '0 24px', 
          background: '#fff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 99,
          boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', width: 48, height: 48, marginRight: 16 }}
              className="trigger-btn"
            />
            
            {/* Mobile Trigger */}
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileDrawerOpen(true)}
              style={{ fontSize: '16px', width: 48, height: 48, marginRight: 16, display: 'none' }} // Visible on mobile via CSS
              className="mobile-trigger-btn"
            />
            
            {/* Global Search */}
            <div className="header-search" style={{ width: 300 }}>
               <Input.Search 
                 placeholder="Search books..." 
                 allowClear
                 onSearch={(value) => navigate(`/search?q=${value}`)}
                 style={{ width: '100%' }}
               />
            </div>
          </div>

          <Space size={24}>
            <GlobalNotifier />
            <Dropdown overlay={userMenu} placement="bottomRight">
              <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <Avatar 
                  src={user.avatar} 
                  icon={<UserOutlined />} 
                  style={{ backgroundColor: token.colorPrimary }} 
                />
                <span style={{ marginLeft: 8, fontWeight: 500, display: 'none', md: 'block' }} className="username-text">
                  {user.name || 'User'}
                </span>
              </div>
            </Dropdown>
          </Space>
        </Header>
        
        <Content style={{ 
          padding: 0, // Let PageContainer handle padding
          minHeight: 280, 
          overflow: 'initial' 
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default LayoutMenu;
