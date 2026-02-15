import React, { useState, useEffect, useRef } from "react";
import { Layout, Menu, Button, Dropdown, Avatar, Input, Space, Drawer, Typography, theme, AutoComplete, Grid } from "antd";
import {
  HomeOutlined,
  SearchOutlined,
  BookOutlined,
  UserOutlined,
  LogoutOutlined,
  RobotOutlined,
  SettingOutlined,
  MessageOutlined,
  MenuOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  HistoryOutlined
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import GlobalNotifier from "../../components/GlobalNotifier";
import { getBooks } from "../../api";
import "./LayoutMenu.css";

const { Sider, Content, Header } = Layout;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const LayoutMenu = ({ onLogout, children }) => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [user, setUser] = useState({});
  const [hideMobileNav, setHideMobileNav] = useState(false);
  const menuBtnRef = useRef(null);
  const drawerContainerRef = useRef(null);
  const drawerDescId = 'mobile-drawer-desc';

  useEffect(() => {
    if (!mobileDrawerOpen) return;
    const root = drawerContainerRef.current?.closest('.ant-drawer-body') || drawerContainerRef.current;
    if (!root) return;
    const focusableSelectors = [
      'a[href]', 'button:not([disabled])', 'input:not([disabled])',
      'select:not([disabled])', 'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      const nodes = Array.from(root.querySelectorAll(focusableSelectors)).filter(el => el.offsetParent !== null);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    root.addEventListener('keydown', handleKeyDown);
    return () => root.removeEventListener('keydown', handleKeyDown);
  }, [mobileDrawerOpen]);
  
  const [allBooks, setAllBooks] = useState([]);
  const [searchOptions, setSearchOptions] = useState([]);
  const [booksLoaded, setBooksLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
      setUser(raw ? JSON.parse(raw) : {});
    } catch {
      setUser({});
    }
  }, []);

  const isMobile = !screens.md;

  useEffect(() => {
    const handleFocusIn = (e) => {
      if (!isMobile) return;
      const el = e.target;
      const tag = (el?.tagName || '').toUpperCase();
      const editable = el?.isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || editable) {
        setHideMobileNav(true);
      }
    };
    const handleFocusOut = () => {
      if (!isMobile) return;
      setHideMobileNav(false);
    };
    const handleVVResize = () => {
      if (!isMobile || !window.visualViewport) return;
      const ratio = window.visualViewport.height / window.innerHeight;
      setHideMobileNav(ratio < 0.75);
    };
    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVVResize);
    }
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleVVResize);
      }
    };
  }, [isMobile]);

  const fetchBooks = async () => {
    if (booksLoaded) return;
    try {
      const res = await getBooks();
      if (res && res.data) {
        setAllBooks(res.data);
        setBooksLoaded(true);
      }
    } catch (error) {
      console.error("Failed to load books for search suggestions", error);
    }
  };

  const handleSearch = (value) => {
    if (!booksLoaded) {
       fetchBooks();
    }
    
    if (!value) {
      setSearchOptions([]);
      return;
    }
    
    const lowerVal = value.toLowerCase();
    const filtered = allBooks
      .filter(book => 
        book.title.toLowerCase().includes(lowerVal) || 
        book.author.toLowerCase().includes(lowerVal) ||
        (book.isbn && book.isbn.includes(lowerVal))
      )
      .slice(0, 8)
      .map(book => ({
        value: book.title,
        label: (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
               <Text strong style={{ fontSize: 14 }}>{book.title}</Text>
               <Text type="secondary" style={{ fontSize: 12 }}>{book.author}</Text>
            </div>
            {book.category && <span style={{ fontSize: 11, color: token.colorTextQuaternary, marginLeft: 8 }}>{book.category}</span>}
          </div>
        ),
        bookId: book._id || book.id
      }));
      
    setSearchOptions(filtered);
  };

  const onSelect = (value, option) => {
    navigate(`/book/${option.bookId}`);
  };

  const menuItems = [
    { key: "home", icon: <HomeOutlined />, label: t("nav.home") || "Home" },
    { key: "search", icon: <SearchOutlined />, label: t("nav.books") || "Library" },
    { key: "borrow", icon: <BookOutlined />, label: t("nav.myBooks") || "My Books" },
    { key: "return", icon: <HistoryOutlined />, label: t("nav.borrowHistory") || "Borrow History" },
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

  const mobileNavItems = [
    { key: "home", icon: <HomeOutlined />, label: t("nav.home") || "Home" },
    { key: "search", icon: <SearchOutlined />, label: t("nav.books") || "Search" },
    { key: "borrow", icon: <BookOutlined />, label: t("nav.myBooks") || "My Books" },
    { key: "profile", icon: <UserOutlined />, label: t("common.profile") || "Profile" },
  ];

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
        {t("common.profile")}
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />} onClick={() => navigate('/settings')}>
        {t("common.settings")}
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />} danger onClick={onLogout}>
        {t("common.logout")}
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
      borderBottom: `1px solid ${token.colorBorderSecondary}`,
      background: 'transparent',
    }}>
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorWarning})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: token.colorWhite,
        fontWeight: 'bold',
        fontSize: 18,
        fontFamily: "'Literata', serif",
        flexShrink: 0,
        boxShadow: token.boxShadowSecondary
      }}>
        C
      </div>
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
          CLMS
        </span>
      )}
    </div>
  );

  return (
    <Layout style={{ minHeight: "100vh", background: 'transparent' }}>
      {!isMobile && (
        <Sider
          id="app-sider"
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={280}
          theme="light"
          style={{
            borderRight: `1px solid ${token.colorBorderSecondary}`,
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
            background: token.colorBgContainer,
            backdropFilter: 'blur(20px)',
            boxShadow: token.boxShadowTertiary
          }}
        >
          <Logo />
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 64px)' }}>
            <div style={{ flex: 1, padding: '24px 0', overflowY: 'auto' }}>
              <Menu
                mode="inline"
                selectedKeys={[getSelectedKey()]}
                items={menuItems}
                onClick={handleMenuClick}
                className="custom-menu"
              />
            </div>
            
            <div style={{ 
              padding: 20, 
              borderTop: `1px solid ${token.colorBorderSecondary}`,
              background: token.colorBgContainer
            }}>
               <div style={{ display: 'flex', alignItems: 'center', marginBottom: collapsed ? 0 : 16, justifyContent: collapsed ? 'center' : 'flex-start' }}>
                  <Avatar 
                    src={user.avatar} 
                    icon={<UserOutlined />} 
                    size={collapsed ? 32 : 40}
                    style={{ backgroundColor: token.colorPrimary, cursor: 'pointer' }} 
                    onClick={() => navigate('/profile')}
                  />
                  {!collapsed && (
                    <div style={{ marginLeft: 12, overflow: 'hidden' }}>
                      <Text strong style={{ display: 'block', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user.name || 'Reader'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {user.role || 'Member'}
                      </Text>
                    </div>
                  )}
               </div>
               
               {!collapsed && (
                  <Button 
                    block 
                    icon={<LogoutOutlined />} 
                    onClick={onLogout}
                    type="text"
                    danger
                    style={{ textAlign: 'left', borderRadius: 8 }}
                  >
                    {t("common.logout") || "Logout"}
                  </Button>
               )}
            </div>
          </div>
        </Sider>
      )}

      <Drawer
        placement="left"
        onClose={() => setMobileDrawerOpen(false)}
        open={mobileDrawerOpen}
        aria-labelledby="mobile-drawer-title"
        aria-describedby={drawerDescId}
        afterOpenChange={(open) => {
          if (open) {
            setTimeout(() => {
              try {
                const root = drawerContainerRef.current;
                if (!root) return;
                const selected = root.querySelector('.ant-menu-item-selected');
                const first = root.querySelector('.ant-menu-item');
                (selected || first)?.focus?.();
              } catch {
                void 0;
              }
            }, 0);
          } else if (menuBtnRef.current) {
            try {
              menuBtnRef.current.focus();
            } catch {
              void 0;
            }
          }
        }}
        styles={{ body: { padding: 0 } }}
        width={280}
        title={<Logo />}
      >
        <h2 id="mobile-drawer-title" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(1px,1px,1px,1px)' }}>
          {t("common.mobileMenuTitle") || "Main Menu"}
        </h2>
        <p id={drawerDescId} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(1px,1px,1px,1px)' }}>
          {(t("common.mobileNav") || "Bottom Navigation") + ". " + (t("common.drawerInstructions") || "Use Tab to navigate, Enter to activate, Esc to close.")}
        </p>
        <div ref={drawerContainerRef}>
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            onClick={handleMenuClick}
            className="custom-menu"
            style={{ border: 'none' }}
          />
        </div>
        <div style={{ padding: 20, borderTop: `1px solid ${token.colorBorderSecondary}`, marginTop: 'auto' }}>
           <Button 
             block 
             icon={<LogoutOutlined />} 
             onClick={onLogout}
             danger
             style={{ borderRadius: 20 }}
           >
             {t("common.logout")}
           </Button>
        </div>
      </Drawer>

      <Layout style={{ 
        marginLeft: isMobile ? 0 : (collapsed ? 80 : 280), 
        transition: 'margin-left 0.2s', 
        background: 'transparent',
        minHeight: '100vh'
      }}>
        <Header style={{ 
          padding: isMobile ? '0 16px' : '0 32px', 
          background: token.colorBgElevated,
          backdropFilter: 'blur(12px)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 99,
          height: isMobile ? 64 : 72,
          borderBottom: `1px solid ${token.colorBorderSecondary}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {isMobile ? (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  type="text"
                  icon={<MenuOutlined />}
                  onClick={() => setMobileDrawerOpen(true)}
                  aria-label={t("common.openMenu") || "Open Menu"}
                  title={t("common.openMenu") || "Open Menu"}
                  ref={menuBtnRef}
                  style={{ fontSize: '18px', width: 40, height: 40, marginRight: 8 }}
                />
                <span style={{ 
                  fontWeight: 700, 
                  fontSize: 18, 
                  fontFamily: "'Literata', serif",
                  color: token.colorTextHeading
                }}>
                  CLMS
                </span>
              </div>
            ) : (
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                aria-label={t("common.toggleSidebar") || "Toggle Sidebar"}
                aria-controls="app-sider"
                aria-expanded={!collapsed}
                title={t("common.toggleSidebar") || "Toggle Sidebar"}
                style={{ fontSize: '18px', width: 40, height: 40, color: token.colorTextSecondary }}
              />
            )}
            
            {!isMobile && (
              <Text strong style={{ 
                fontSize: 18, 
                fontFamily: "'Literata', serif",
                color: token.colorTextHeading 
              }}>
                {menuItems.find(item => item.key === getSelectedKey())?.label || "Library"}
              </Text>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {!isMobile && (
              <div style={{ width: 300 }}>
                 <AutoComplete
                   options={searchOptions}
                   onSelect={onSelect}
                   onSearch={handleSearch}
                   onFocus={fetchBooks}
                   style={{ width: '100%' }}
                 >
                   <Input.Search 
                     placeholder={t("common.searchBooks")} 
                     aria-label={t("common.searchBooks") || "Search books"}
                     allowClear
                     onSearch={(value) => navigate(`/search?q=${value}`)}
                     style={{ borderRadius: 20 }}
                     className="glass-search"
                   />
                 </AutoComplete>
              </div>
            )}

            <Space size={16}>
              {isMobile && (
                 <Button 
                   type="text" 
                   icon={<SearchOutlined />} 
                   onClick={() => navigate('/search')} 
                   shape="circle" 
                   aria-label={t("common.search") || "Search"}
                   title={t("common.search") || "Search"}
                 />
              )}
              <GlobalNotifier />
              {isMobile && (
                <Dropdown overlay={userMenu} placement="bottomRight">
                  <Avatar 
                    src={user.avatar} 
                    icon={<UserOutlined />} 
                    style={{ backgroundColor: token.colorPrimary, cursor: 'pointer' }} 
                  />
                </Dropdown>
              )}
            </Space>
          </div>
        </Header>
        
        <Content role="main" id="main-content" style={{ 
          padding: 0, 
          minHeight: 280, 
          overflow: 'initial',
          paddingBottom: isMobile ? (hideMobileNav ? 0 : 80) : 'env(safe-area-inset-bottom)' 
        }}>
          {children}
        </Content>

        {isMobile && !hideMobileNav && (
          <div className="mobile-bottom-nav" role="navigation" aria-label={t("common.mobileNav") || "Bottom Navigation"} aria-controls="main-content" style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 64,
            background: token.colorBgElevated,
            backdropFilter: 'blur(16px)',
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            zIndex: 1000,
            paddingBottom: 'env(safe-area-inset-bottom)',
            boxShadow: token.boxShadowTertiary
          }}>
            <ul style={{ listStyle: 'none', display: 'flex', margin: 0, padding: 0, width: '100%', height: '100%' }}>
            {mobileNavItems.map(item => {
              const isActive = getSelectedKey() === item.key;
              return (
                <li key={item.key} style={{ flex: 1, height: '100%' }}>
                  <button
                    onClick={() => navigate(`/${item.key}`)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer',
                      color: isActive ? token.colorPrimary : token.colorTextQuaternary,
                      transition: 'all 0.25s ease',
                      borderTop: isActive ? `2px solid ${token.colorPrimary}` : '2px solid transparent',
                      background: isActive ? token.colorPrimaryBg : 'transparent',
                      border: 'none',
                      outline: 'none',
                      padding: 0
                    }}
                    role="link"
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={item.label}
                  >
                    <span aria-hidden="true" style={{ 
                      fontSize: 22, 
                      marginBottom: 2,
                      transform: isActive ? 'translateY(-2px) scale(1.02)' : 'none',
                      transition: 'transform 0.25s ease'
                    }}>
                      {item.icon}
                    </span>
                    <span style={{ 
                      fontSize: 10, 
                      fontWeight: isActive ? 600 : 400,
                      fontFamily: "'Inter', sans-serif",
                      letterSpacing: 0.2
                    }}>
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
            </ul>
          </div>
        )}
      </Layout>
    </Layout>
  );
};

export default LayoutMenu;
