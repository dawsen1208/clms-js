import React, { useMemo, useEffect, useState, useCallback } from "react";
import { Card, Typography, Radio, Space, Divider, Input, Switch, Form, Button, Table, Tag, message, Select, InputNumber, Checkbox, Tabs, Grid, Modal, ColorPicker, Slider, Row, Col, theme } from "antd";
import { 
  LockOutlined, DesktopOutlined, DeleteOutlined, SafetyCertificateOutlined,
  GlobalOutlined, BgColorsOutlined, FormatPainterOutlined, FontSizeOutlined, 
  CalendarOutlined, SearchOutlined, SortAscendingOutlined, AppstoreOutlined, 
  TagsOutlined, ReloadOutlined, RobotOutlined, BuildOutlined, TeamOutlined,
  BellOutlined, SettingOutlined, PictureOutlined, SoundOutlined, BulbOutlined
} from "@ant-design/icons";
import { updateProfile, changePassword, getSessions, revokeSession, revokeAllSessions, getBooks, toggle2FA, sendEmailVerifyCode, verifyAndBindEmail, updateEmailNotifySettings } from "../api";
import { useLanguage } from "../contexts/LanguageContext";
import { useAccessibility } from "../contexts/AccessibilityContext";
import { useMotionEnabled } from "../motion/useMotionEnabled";
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";
import { useLocation, useNavigate } from "react-router-dom";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { useToken } = theme;

export const SettingsLeftPanel = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const active = new URLSearchParams(location.search).get("pane") || "language";
  const items = [
    { key: "language", icon: <GlobalOutlined />, label: t("settings.language") },
    { key: "appearance", icon: <BgColorsOutlined />, label: t("settings.appearance") },
    { key: "accessibility", icon: <RobotOutlined />, label: t("settings.accessibility") || "Accessibility" },
    { key: "notifications", icon: <BellOutlined />, label: t("settings.notifications") || "Notifications" },
    { key: "borrowing", icon: <CalendarOutlined />, label: t("settings.borrowing") },
    { key: "account", icon: <LockOutlined />, label: t("settings.account") || "Account" },
    { key: "recommend", icon: <TagsOutlined />, label: t("settings.recommendation") || "Recommendation" },
    { key: "operation", icon: <AppstoreOutlined />, label: t("settings.operation") || "Operation" },
  ];
  return (
    <div className="bw-scroll" style={{ padding: 24 }}>
      <Typography.Title level={3} style={{ fontFamily: "'Literata', serif", marginBottom: 8 }}>
        {t("settings.settings")}
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
        {t("settings.settingsDesc") || "Manage your account and preferences"}
      </Typography.Paragraph>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(it => (
          <Button
            key={it.key}
            type={active === it.key ? "primary" : "default"}
            block
            icon={it.icon}
            onClick={() => navigate(`/settings?pane=${it.key}`, { replace: false })}
            style={{ justifyContent: "flex-start" }}
          >
            {it.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

function SettingsPage({ appearance, onChange, user, onUserUpdate }) {
  const { language, setLanguage, t } = useLanguage();
  const { ttsEnabled: _ttsEnabled, accessibilityMode: _accessibilityMode, updatePrefs } = useAccessibility();
  const { token } = useToken();
  const [modal, contextHolder] = Modal.useModal();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { motionEnabled, setMotionEnabled } = useMotionEnabled();
  const location = useLocation();
  const navigate = useNavigate();
  const activePane = new URLSearchParams(location.search).get("pane") || "language";

  const tt = (key, fallback) => {
    try {
      const val = t(key);
      if (!val || val === key) return fallback;
      return val;
    } catch {
      return fallback;
    }
  };

  // ✅ Fix: Use useCallback and ensure handleUpdate is available
  const handleUpdate = useCallback((updates) => {
    if (onChange) {
      onChange(prev => ({ ...prev, ...updates }));
    }
  }, [onChange]);

  const [gmail, setGmail] = useState(user?.gmailAddress || user?.email || "");
  const [gmailVerified, setGmailVerified] = useState(!!user?.gmailVerified);
  const [gmailPrefs, setGmailPrefs] = useState(() => ({
    enabled: !!user?.externalEmailNotifyEnabled,
    borrow: !!user?.externalEmailNotifyEvents?.borrow,
    return: !!user?.externalEmailNotifyEvents?.return,
    requestApproved: !!user?.externalEmailNotifyEvents?.requestApproved,
  }));
  const [gmailCode, setGmailCode] = useState("");
  const [gmailTimer, setGmailTimer] = useState(0);
  const [gmailLoading, setGmailLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (typeof user.gmailAddress === "string") {
      setGmail(user.gmailAddress);
    }
    if (typeof user.gmailVerified === "boolean") {
      setGmailVerified(user.gmailVerified);
    }
    if (user.externalEmailNotifyEvents) {
      setGmailPrefs({
        enabled: !!user.externalEmailNotifyEnabled,
        borrow: !!user.externalEmailNotifyEvents.borrow,
        return: !!user.externalEmailNotifyEvents.return,
        requestApproved: !!user.externalEmailNotifyEvents.requestApproved,
      });
    }
  }, [user]);

  useEffect(() => {
    let interval;
    if (gmailTimer > 0) {
      interval = setInterval(() => setGmailTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [gmailTimer]);

  const authToken = useMemo(() => {
    return sessionStorage.getItem("token") || localStorage.getItem("token");
  }, []);

  const notifPrefs = useMemo(() => {
    try {
      const raw = localStorage.getItem("notification_prefs");
      return raw ? JSON.parse(raw) : { inApp: true, email: false, reminderDays: 3 };
    } catch {
      return { inApp: true, email: false, reminderDays: 3 };
    }
  }, []);

  const saveNotifications = async (patch) => {
    const next = { ...notifPrefs, ...patch };
    try { localStorage.setItem("notification_prefs", JSON.stringify(next)); } catch (error) { void error; }
    try {
      if (authToken) {
        await updateProfile(authToken, { preferences: { notifications: next } });
      }
    } catch (error) { void error; }
  };

  const handleToggle2FA = async (checked) => {
    if (!gmailVerified && checked) {
      message.warning(t("settings.bindEmailFirst"));
      return;
    }

    try {
      await toggle2FA(authToken, checked);
      saveSecurity({ twoFactorEnabled: checked });
      message.success(checked ? t("settings.2faEnabled") : t("settings.2faDisabled"));
      
      // ✅ Update global user state for persistence
      const storedUser = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "{}");
      storedUser.is_2fa_enabled = checked;
      // Also update nested preferences if they exist
      if (!storedUser.preferences) storedUser.preferences = {};
      if (!storedUser.preferences.security) storedUser.preferences.security = {};
      storedUser.preferences.security.twoFactorEnabled = checked;
      
      sessionStorage.setItem("user", JSON.stringify(storedUser));
      localStorage.setItem("user", JSON.stringify(storedUser));
      
      if (onUserUpdate) {
        onUserUpdate(storedUser);
      }
    } catch {
      message.error(t("settings.operationFailed"));
    }
  };

  const validateGmail = (value) => {
    if (!value) return false;
    const v = value.trim();
    return /^\S+@\S+\.\S+$/.test(v);
  };

  const handleBindGmail = async () => {
    if (!gmail || !validateGmail(gmail)) {
      message.error("请输入有效的邮箱地址");
      return;
    }
    if (!authToken) {
      message.error(t("settings.notLoggedIn") || "Please login first.");
      return;
    }
    try {
      setGmailLoading(true);
      const res = await sendEmailVerifyCode(gmail.trim());
      const expires = res?.data?.expiresInSec || 600;
      setGmailVerified(false);
      setGmailPrefs((prev) => ({ ...prev }));
      setGmailCode("");
      setGmailTimer(expires);
      if (res?.data?.mailSent === false) {
        message.warning("验证码请求已创建，但邮件服务配置有问题，请联系管理员检查 SMTP 配置");
      } else {
        message.success("验证码已发送至您的邮箱");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "绑定邮箱失败";
      message.error(msg);
    } finally {
      setGmailLoading(false);
    }
  };

  const handleSendGmailCode = async () => {
    if (!gmail || !validateGmail(gmail)) {
      message.error("请先输入有效的邮箱地址");
      return;
    }
    if (!authToken) {
      message.error(t("settings.notLoggedIn") || "Please login first.");
      return;
    }
    try {
      setGmailLoading(true);
      const res = await sendEmailVerifyCode(gmail.trim());
      const expires = res?.data?.expiresInSec || 600;
      setGmailTimer(expires);
      if (res?.data?.mailSent === false) {
        message.warning("验证码请求已创建，但邮件服务配置有问题，请联系管理员检查 SMTP 配置");
      } else {
        message.success("验证码已发送至您的邮箱");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "发送验证码失败";
      message.error(msg);
    } finally {
      setGmailLoading(false);
    }
  };

  const handleVerifyGmail = async () => {
    if (!gmailCode) {
      message.error("请输入验证码");
      return;
    }
    if (!authToken) {
      message.error(t("settings.notLoggedIn") || "Please login first.");
      return;
    }
    try {
      setGmailLoading(true);
      const res = await verifyAndBindEmail(gmail.trim(), gmailCode.trim());
      const verified = res?.data?.gmailVerified || res?.data?.user?.gmailVerified;
      if (verified) {
        setGmailVerified(true);
        const nextUser = {
          ...(user || {}),
          gmailAddress: gmail.trim(),
          gmailVerified: true,
        };
        try {
          sessionStorage.setItem("user", JSON.stringify(nextUser));
          if (localStorage.getItem("user")) {
            localStorage.setItem("user", JSON.stringify(nextUser));
          }
        } catch (error) {
          void error;
        }
        if (onUserUpdate) {
          onUserUpdate(nextUser);
        }
      }
      setGmailCode("");
      message.success("邮箱验证成功");
    } catch (err) {
      const msg = err?.response?.data?.message || "验证失败";
      message.error(msg);
    } finally {
      setGmailLoading(false);
    }
  };

  const patchGmailPrefs = async (patch) => {
    if (!authToken) {
      message.error(t("settings.notLoggedIn") || "Please login first.");
      return;
    }
    const next = { ...gmailPrefs, ...patch };
    setGmailPrefs(next);
    try {
      const res = await updateEmailNotifySettings({
        externalEmailNotifyEnabled: next.enabled,
        events: {
          borrow: next.borrow,
          return: next.return,
          requestApproved: next.requestApproved,
        },
      });
      const prefs = res?.data?.preferences || res?.data;
      if (prefs) {
        setGmailPrefs({
          enabled: !!prefs.externalEmailNotifyEnabled,
          borrow: !!prefs.externalEmailNotifyEvents?.borrow,
          return: !!prefs.externalEmailNotifyEvents?.return,
          requestApproved: !!prefs.externalEmailNotifyEvents?.requestApproved,
        });
        if (typeof prefs.gmailVerified === "boolean") {
          setGmailVerified(prefs.gmailVerified);
        }
        if (typeof prefs.gmailAddress === "string") {
          setGmail(prefs.gmailAddress);
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "更新邮件通知配置失败";
      if (patch.enabled === true && err?.response?.status === 400) {
        setGmailPrefs((prev) => ({ ...prev, enabled: false }));
      }
      message.error(msg);
    }
  };

  const [operationPrefs, setOperationPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem("operation_prefs");
      return raw ? JSON.parse(raw) : { searchBy: 'title', sortBy: 'latest', view: 'list', showAdvanced: false };
    } catch {
      return { searchBy: 'title', sortBy: 'latest', view: 'list', showAdvanced: false };
    }
  });

  const saveOperation = async (patch) => {
    const next = { ...operationPrefs, ...patch };
    setOperationPrefs(next);
    try { localStorage.setItem("operation_prefs", JSON.stringify(next)); } catch (error) { void error; }
    try {
      if (authToken) {
        await updateProfile(authToken, { preferences: { operation: next } });
      }
    } catch (error) { void error; }
  };

  const [recommendPrefs, setRecommendPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem("recommend_prefs");
      return raw ? JSON.parse(raw) : { preferredCategories: [], excludedCategories: [], autoLearn: true };
    } catch {
      return { preferredCategories: [], excludedCategories: [], autoLearn: true };
    }
  });
  const [allCategories, setAllCategories] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await getBooks();
        const list = res?.data || [];
        const cats = Array.from(new Set(list.map(b => b.category).filter(Boolean))).sort();
        setAllCategories(cats);
      } catch (error) { void error; }
    })();
  }, []);

  const saveRecommend = async (patch) => {
    const next = { ...recommendPrefs, ...patch };
    setRecommendPrefs(next);
    try { localStorage.setItem("recommend_prefs", JSON.stringify(next)); } catch (error) { void error; }
    try {
      if (authToken) {
        await updateProfile(authToken, { preferences: { recommendation: next } });
      }
    } catch (error) { void error; }
  };

  const [adminApprovalPrefs, setAdminApprovalPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem("admin_approval_prefs");
      return raw ? JSON.parse(raw) : { autoApproveWhenStockGt: 2, autoRejectWhenOverdueGt: 3, defaultBulkAction: 'approve', soundEnabled: true };
    } catch {
      return { autoApproveWhenStockGt: 2, autoRejectWhenOverdueGt: 3, defaultBulkAction: 'approve', soundEnabled: true };
    }
  });

  const saveAdminApproval = async (patch) => {
    const next = { ...adminApprovalPrefs, ...patch };
    setAdminApprovalPrefs(next);
    try { localStorage.setItem("admin_approval_prefs", JSON.stringify(next)); } catch (error) { void error; }
    try {
      if (authToken) {
        await updateProfile(authToken, { preferences: { adminApproval: next } });
      }
    } catch (error) { void error; }
  };

  const [adminPermissions, setAdminPermissions] = useState(() => {
    try {
      const raw = localStorage.getItem("admin_permissions");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });
  const [permEditing, setPermEditing] = useState({ id: "", modules: [] });
  const moduleOptions = [
    { label: t("admin.dashboard"), value: "home" },
    { label: t("common.bookSearch"), value: "book" },
    { label: t("common.borrowManage"), value: "borrow" },
    { label: t("admin.history"), value: "history" },
    { label: t("admin.userManage"), value: "users" },
    { label: t("common.profile"), value: "profile" },
    { label: t("common.settings"), value: "settings" },
  ];

  const saveAdminPermissions = async (nextMap) => {
    setAdminPermissions(nextMap);
    try { localStorage.setItem("admin_permissions", JSON.stringify(nextMap)); } catch (error) { void error; }
    try {
      if (authToken) {
        await updateProfile(authToken, { preferences: { adminPermissions: nextMap } });
      }
    } catch (error) { void error; }
  };

  const [securityPrefs, setSecurityPrefs] = useState(() => {
    // Priority: User prop > LocalStorage > Default
    if (user?.preferences?.security) {
      return user.preferences.security;
    }
    // Fallback for flat structure if backend returns it there
    if (user && typeof user.is_2fa_enabled !== 'undefined') {
      return { twoFactorEnabled: user.is_2fa_enabled };
    }

    try {
      const raw = localStorage.getItem("security_prefs");
      return raw ? JSON.parse(raw) : { twoFactorEnabled: false };
    } catch {
      return { twoFactorEnabled: false };
    }
  });

  // ✅ Sync security prefs when user prop updates
  useEffect(() => {
    if (user?.preferences?.security) {
      setSecurityPrefs(prev => ({ ...prev, ...user.preferences.security }));
    } else if (user && typeof user.is_2fa_enabled !== 'undefined') {
       setSecurityPrefs(prev => ({ ...prev, twoFactorEnabled: user.is_2fa_enabled }));
    }
  }, [user]);

  const saveSecurity = async (patch) => {
    const next = { ...securityPrefs, ...patch };
    setSecurityPrefs(next);
    try { localStorage.setItem("security_prefs", JSON.stringify(next)); } catch (error) { void error; }
    try {
      if (authToken) {
        await updateProfile(authToken, { preferences: { security: next } });
      }
    } catch (error) { void error; }
  };

  const [borrowingPrefs, setBorrowingPrefs] = useState(() => {
    // Priority: User prop > LocalStorage > Default
    if (user?.preferences?.borrowing) {
      return user.preferences.borrowing;
    }
    try {
      const raw = localStorage.getItem("borrowing_prefs");
      return raw ? JSON.parse(raw) : { defaultDuration: 30 };
    } catch {
      return { defaultDuration: 30 };
    }
  });

  // Sync borrowing prefs when user prop updates
  useEffect(() => {
    if (user?.preferences?.borrowing) {
      setBorrowingPrefs(user.preferences.borrowing);
    }
  }, [user]);

  const saveBorrowing = async (patch) => {
    const next = { ...borrowingPrefs, ...patch };
    setBorrowingPrefs(next);
    try { localStorage.setItem("borrowing_prefs", JSON.stringify(next)); } catch (error) { void error; }
    try {
      if (authToken) {
        await updateProfile(authToken, { preferences: { borrowing: next } });
      }
    } catch (error) { void error; }
  };

  const [accessibilityPrefs, setAccessibilityPrefs] = useState(() => {
    // Priority: User prop > LocalStorage > Default
    if (user?.preferences?.accessibility) {
      return user.preferences.accessibility;
    }
    
    try {
      const raw = localStorage.getItem("accessibility_prefs");
      return raw ? JSON.parse(raw) : { accessibilityMode: false, ttsEnabled: false };
    } catch {
      return { accessibilityMode: false, ttsEnabled: false };
    }
  });

  const saveAccessibility = async (patch) => {
    const next = { ...accessibilityPrefs, ...patch };
    setAccessibilityPrefs(next);
    // Also sync with global context
    if (updatePrefs) {
      updatePrefs(next);
    }
    
    try { localStorage.setItem("accessibility_prefs", JSON.stringify(next)); } catch (error) { void error; }
    try {
      if (authToken) {
        await updateProfile(authToken, { preferences: { accessibility: next } });
      }
    } catch (error) { void error; }
  };

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [devicesModalOpen, setDevicesModalOpen] = useState(false);
  const [fontSizeModalOpen, setFontSizeModalOpen] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [themeColorModalOpen, setThemeColorModalOpen] = useState(false);
  const [tempThemeColor, setTempThemeColor] = useState('');
  const [tempCustomColor, setTempCustomColor] = useState('');

  const [bgModalOpen, setBgModalOpen] = useState(false);
  const [tempBgColor, setTempBgColor] = useState('');

  const confirmThemeColor = () => {
    handleUpdate({ 
        themeColor: tempThemeColor, 
        customColor: tempThemeColor === 'custom' ? tempCustomColor : (appearance?.customColor || '#1677FF')
    });
    setThemeColorModalOpen(false);
  };

  const confirmBgColor = () => {
    handleUpdate({ backgroundColor: tempBgColor });
    setBgModalOpen(false);
  };

  const [reminderDaysModalOpen, setReminderDaysModalOpen] = useState(false);
  const [searchPrefModalOpen, setSearchPrefModalOpen] = useState(false);
  const [sortPrefModalOpen, setSortPrefModalOpen] = useState(false);
  const [viewPrefModalOpen, setViewPrefModalOpen] = useState(false);
  const [categoryPrefModalOpen, setCategoryPrefModalOpen] = useState(false);
  const [autoRulesModalOpen, setAutoRulesModalOpen] = useState(false);
  const [bulkActionModalOpen, setBulkActionModalOpen] = useState(false);
  const [rolesModalOpen, setRolesModalOpen] = useState(false);

  const fetchSessions = async () => {
    if (!authToken) return;
    setSessionsLoading(true);
    try {
      const res = await getSessions(authToken);
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.sessions || []);
      setSessions(list.map((s) => ({
        key: s.id || s._id || `${s.device}-${s.ip}-${s.loginTime}`,
        device: s.device || s.userAgent || t("common.unknown"),
        ip: s.ip || s.ipAddress || "-",
        loginTime: s.loginTime || s.createdAt || s.lastUsedAt || Date.now(),
        id: s.id || s._id,
      })));
    } catch (error) {
      void error;
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  // avoid auto-calling session endpoint to prevent 404 in dev when backend not implemented



  return (
    <PageContainer>
      {contextHolder}
      {/* 主标题统一在左页，右页不再渲染 PageHeader */}
      
      <Tabs
        activeKey={activePane}
        onChange={(k) => navigate(`/settings?pane=${k}`, { replace: true })}
        tabBarStyle={{ display: "none" }}
        items={[
          {
            key: "language",
            label: (<span><GlobalOutlined /> {t("settings.language")}</span>),
            children: (
              <Card 
                style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary }} 
                title={<Title level={4} style={{ margin: 0 }}><GlobalOutlined /> {t("settings.language")}</Title>}
                bordered={false}
              >
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                  <Card 
                    hoverable 
                    onClick={() => setLanguageModalOpen(true)} 
                    style={{ 
                      cursor: 'pointer', 
                      borderColor: appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder, 
                      background: appearance?.highContrast ? '#000' : token.colorBgContainer 
                    }}
                  >
                    <Space align="start">
                        <GlobalOutlined style={{ fontSize: 24, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorPrimary }} />
                        <div>
                            <Text strong style={{ display: 'block', color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>{t("settings.language")}</Text>
                            <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorTextSecondary }}>{t("settings.languageDesc")}</Text>
                        </div>
                    </Space>
                  </Card>
                  <Card 
                    hoverable 
                    style={{ 
                      cursor: 'pointer', 
                      borderColor: appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder, 
                      background: appearance?.highContrast ? '#000' : token.colorBgContainer 
                    }}
                  >
                    <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                      <div>
                        <Text strong style={{ display: 'block', color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>Animations</Text>
                        <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorTextSecondary }}>3D page flip / shared element / login animation</Text>
                      </div>
                      <Switch checked={motionEnabled} onChange={(checked) => setMotionEnabled(checked)} />
                    </Space>
                  </Card>
                </div>
                <Modal title={t("settings.language")} open={languageModalOpen} onCancel={() => setLanguageModalOpen(false)} footer={null}>
                   <Radio.Group value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: '100%' }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Radio value="en" style={{ padding: 12, border: `1px solid ${token.colorBorder}`, borderRadius: token.borderRadius, width: '100%' }}>🇺🇸 English</Radio>
                        <Radio value="zh" style={{ padding: 12, border: `1px solid ${token.colorBorder}`, borderRadius: token.borderRadius, width: '100%' }}>🇨🇳 中文</Radio>
                      </Space>
                   </Radio.Group>
                </Modal>
              </Card>
            ),
          },
          {
            key: "accessibility",
            label: (<span><SoundOutlined /> {t("settings.accessibility") || "Accessibility"}</span>),
            children: (
              <Card 
                style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary }} 
                title={<Title level={4} style={{ margin: 0 }}><SoundOutlined /> {t("settings.accessibility") || "Accessibility"}</Title>}
                bordered={false}
              >
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: appearance?.highContrast ? '#000' : token.colorBgLayout, borderRadius: token.borderRadius, border: '1px solid ' + (appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder) }}>
                    <Space>
                       <SoundOutlined style={{ fontSize: 20, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorPrimary }} />
                       <div>
                         <Text strong style={{ display: 'block', color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>{t("settings.tts") || "Text-to-Speech"}</Text>
                         <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorTextSecondary }}>{t("settings.ttsDesc") || "Enable text-to-speech for buttons and content"}</Text>
                       </div>
                    </Space>
                    <Switch checked={!!accessibilityPrefs.ttsEnabled} onChange={(v) => saveAccessibility({ ttsEnabled: v })} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: appearance?.highContrast ? '#000' : token.colorBgLayout, borderRadius: token.borderRadius, border: '1px solid ' + (appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder) }}>
                    <Space>
                       <RobotOutlined style={{ fontSize: 20, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorSuccess }} />
                       <div>
                         <Text strong style={{ display: 'block', color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>{t("settings.accessibilityMode") || "Accessibility Mode"}</Text>
                         <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>{t("settings.accessibilityModeDesc") || "Simplified interface with larger elements"}</Text>
                       </div>
                    </Space>
                    <Switch checked={!!accessibilityPrefs.accessibilityMode} onChange={(v) => {
                      saveAccessibility({ accessibilityMode: v });
                      if (onChange) {
                        onChange(prev => ({
                          ...prev,
                          fontSize: v ? 20 : 'normal'
                        }));
                      }
                    }} />
                  </div>
                </Space>
              </Card>
            ),
          },
          {
            key: "appearance",
            label: (<span><BgColorsOutlined /> {t("settings.appearance")}</span>),
            children: (
              <Card 
                style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary }} 
                title={<Title level={4} style={{ margin: 0 }}><BgColorsOutlined /> {t("settings.appearance")}</Title>}
                bordered={false}
              >
                 <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    {/* High Contrast toggle removed */}

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                       <Card 
                         hoverable 
                         style={{ 
                           cursor: 'pointer', 
                           borderColor: appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder, 
                           background: appearance?.highContrast ? '#000' : token.colorBgContainer 
                         }}
                       >
                          <Space direction="vertical" style={{ width: '100%' }}>
                            <Space align="start">
                              <BulbOutlined style={{ fontSize: 24, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorInfo }} />
                              <div>
                                  <Text strong style={{ display: 'block', color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>Reading Room Theme</Text>
                                  <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorTextSecondary }}>Warm Day / Lamp Night</Text>
                              </div>
                            </Space>
                            <Radio.Group
                              onChange={(e) => {
                                const v = e.target.value;
                                try { localStorage.setItem("readingTheme", v); } catch (e) { void e; }
                                const root = document.documentElement;
                                root.classList.remove("theme-day", "theme-night");
                                root.classList.add(v === "night" ? "theme-night" : "theme-day");
                                if (window.matchMedia && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                                  root.classList.add("theme-switching");
                                  setTimeout(() => root.classList.remove("theme-switching"), 250);
                                }
                              }}
                              defaultValue={(typeof window !== 'undefined' && localStorage.getItem("readingTheme")) || "day"}
                            >
                              <Space direction={screens.md ? 'horizontal' : 'vertical'}>
                                <Radio.Button value="day">Warm Day</Radio.Button>
                                <Radio.Button value="night">Lamp Night</Radio.Button>
                              </Space>
                            </Radio.Group>
                          </Space>
                       </Card>
                       <Card 
                         hoverable 
                         onClick={() => setThemeColorModalOpen(true)} 
                         style={{ 
                           cursor: 'pointer', 
                           borderColor: appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder, 
                           background: appearance?.highContrast ? '#000' : token.colorBgContainer 
                         }}
                       >
                          <Space align="start">
                              <FormatPainterOutlined style={{ fontSize: 24, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorPrimary }} />
                              <div>
                                  <Text strong style={{ display: 'block', color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>{t("settings.themeColor")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorTextSecondary }}>{t("settings.themeColorDesc")}</Text>
                              </div>
                          </Space>
                       </Card>
                       <Card 
                         hoverable 
                         onClick={() => setFontSizeModalOpen(true)} 
                         style={{ 
                           cursor: 'pointer', 
                           borderColor: appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder, 
                           background: appearance?.highContrast ? '#000' : token.colorBgContainer 
                         }}
                       >
                          <Space align="start">
                              <FontSizeOutlined style={{ fontSize: 24, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorSuccess }} />
                              <div>
                                  <Text strong style={{ display: 'block', color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>{t("settings.fontSize")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorTextSecondary }}>{t("settings.fontSizeDesc")}</Text>
                              </div>
                          </Space>
                       </Card>
                       <Card 
                         hoverable 
                         onClick={() => setBgModalOpen(true)} 
                         style={{ 
                           cursor: 'pointer', 
                           borderColor: appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder, 
                           background: appearance?.highContrast ? '#000' : token.colorBgContainer 
                         }}
                       >
                          <Space align="start">
                              <PictureOutlined style={{ fontSize: 24, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorError }} />
                              <div>
                                  <Text strong style={{ display: 'block', color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>{t("settings.customBackground")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorTextSecondary }}>{t("settings.customBackgroundDesc")}</Text>
                              </div>
                          </Space>
                       </Card>
                    </div>
                 </Space>
                 {/* Theme mode modal removed */}
                <Modal 
                    title={t("settings.themeColor")} 
                    open={themeColorModalOpen} 
                    onCancel={() => setThemeColorModalOpen(false)} 
                    footer={[
                        <Button key="cancel" onClick={() => setThemeColorModalOpen(false)}>{t("common.cancel") || "Cancel"}</Button>,
                        <Button key="submit" type="primary" onClick={confirmThemeColor}>{t("common.confirm") || "Confirm"}</Button>
                    ]}
                >
                    <Space direction="vertical" style={{ width: '100%' }}>
                        <Radio.Group value={tempThemeColor || 'blue'} onChange={(e) => setTempThemeColor(e.target.value)} style={{ width: '100%' }}>
                          <Space direction="vertical" style={{ width: '100%' }}>
                             <Radio value="blue" style={{ padding: 12, border: `1px solid ${token.colorBorder}`, borderRadius: token.borderRadius, width: '100%' }}>{t("settings.blue")}</Radio>
                             <Radio value="purple" style={{ padding: 12, border: `1px solid ${token.colorBorder}`, borderRadius: token.borderRadius, width: '100%' }}>{t("settings.purple")}</Radio>
                             <Radio value="green" style={{ padding: 12, border: `1px solid ${token.colorBorder}`, borderRadius: token.borderRadius, width: '100%' }}>{t("settings.green")}</Radio>
                             <Radio value="custom" style={{ padding: 12, border: `1px solid ${token.colorBorder}`, borderRadius: token.borderRadius, width: '100%' }}>{t("settings.custom")}</Radio>
                          </Space>
                        </Radio.Group>
                        {tempThemeColor === 'custom' && (
                           <div style={{ marginTop: 16 }}>
                              <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>{t("settings.selectColor") || "Recommended Colors"}</Text>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                                {['#1677FF', '#722ED1', '#13c2c2', '#52c41a', '#eb2f96', '#f5222d', '#fa8c16', '#fadb14'].map(color => (
                                   <div
                                     key={color}
                                     onClick={() => setTempCustomColor(color)}
                                     style={{
                                       width: 32, height: 32, borderRadius: '50%', background: color, cursor: 'pointer',
                                       border: (tempCustomColor || '').toLowerCase() === color.toLowerCase() ? `2px solid ${token.colorBgContainer}` : '1px solid transparent',
                                       boxShadow: (tempCustomColor || '').toLowerCase() === color.toLowerCase() ? `0 0 0 2px ${color}` : '0 2px 4px rgba(0,0,0,0.1)',
                                       transition: 'all 0.2s'
                                     }}
                                   />
                                ))}
                              </div>
                              <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>Hex Code</Text>
                              <Input 
                                 value={tempCustomColor} 
                                 onChange={(e) => setTempCustomColor(e.target.value)} 
                                 placeholder="#1677FF"
                                 maxLength={9}
                                 style={{ width: '100%' }}
                              />
                           </div>
                        )}
                        <Button block onClick={() => { setTempThemeColor('blue'); setTempCustomColor('#1677FF'); }}>{t("common.reset")}</Button>
                    </Space>
                </Modal>
                 <Modal title={t("settings.fontSize")} open={fontSizeModalOpen} onCancel={() => setFontSizeModalOpen(false)} footer={null}>
                     <div style={{ padding: '16px 8px' }}>
                       <Text type="secondary" style={{ marginBottom: 24, display: 'block' }}>{t("settings.fontSizeDesc")}</Text>
                       <Slider
                          min={12}
                          max={30}
                          value={typeof appearance?.fontSize === 'number' ? appearance.fontSize : (appearance?.fontSize === 'large' ? 16 : 14)}
                          onChange={(v) => handleUpdate({ fontSize: v })}
                          marks={{ 12: '12', 14: '14', 16: '16', 20: '20', 24: '24', 30: '30' }}
                       />
                       <div style={{ marginTop: 24, textAlign: 'center' }}>
                         <Text style={{ fontSize: typeof appearance?.fontSize === 'number' ? appearance.fontSize : 14 }}>
                           {t("settings.previewText") || "Preview Text / 预览文本"}
                         </Text>
                       </div>
                     </div>
                 </Modal>
                 <Modal 
                    title={t("settings.customBackground")} 
                    open={bgModalOpen} 
                    onCancel={() => setBgModalOpen(false)} 
                    footer={[
                        <Button key="cancel" onClick={() => setBgModalOpen(false)}>{t("common.cancel") || "Cancel"}</Button>,
                        <Button key="submit" type="primary" onClick={confirmBgColor}>{t("common.confirm") || "Confirm"}</Button>
                    ]}
                 >
                    <Space direction="vertical" style={{ width: '100%' }}>
                       <Text type="secondary">{t("settings.selectColor") || "Recommended Colors"}</Text>
                       <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                          {['#ffffff', '#f0f2f5', '#fafafa', '#f5f5f5', '#e6f7ff', '#f9f0ff', '#f6ffed'].map(color => (
                             <div
                               key={color}
                               onClick={() => setTempBgColor(color)}
                               style={{
                                 width: 32, height: 32, borderRadius: '50%', background: color, cursor: 'pointer',
                                 border: (tempBgColor || '#ffffff').toLowerCase() === color.toLowerCase() ? `2px solid ${token.colorPrimary}` : `1px solid ${token.colorBorder}`,
                                 boxShadow: (tempBgColor || '#ffffff').toLowerCase() === color.toLowerCase() ? `0 0 0 2px ${token.colorPrimary}33` : 'none',
                                 transition: 'all 0.2s'
                               }}
                             />
                          ))}
                       </div>
                       
                       <Text type="secondary" style={{ marginTop: 8 }}>Hex Code</Text>
                       <Input 
                          value={tempBgColor} 
                          onChange={(e) => setTempBgColor(e.target.value)} 
                          placeholder="#ffffff"
                          maxLength={9}
                       />
                       
                       <Button block onClick={() => setTempBgColor("")}>{t("common.reset")}</Button>
                    </Space>
                 </Modal>
              </Card>
            ),
          },

          {
            key: "notifications",
            label: t("settings.notifications"),
            children: (
              <Card style={{ borderRadius: token.borderRadiusLG }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.notifications")}</Title>}>
                <Space direction="vertical" size={16} style={{ width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, background: appearance?.highContrast ? "#000" : token.colorBgLayout, borderRadius: token.borderRadius, border: "1px solid " + (appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder) }}>
                    <Space>
                      <BellOutlined style={{ fontSize: 20, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorWarning }} />
                      <Text strong style={{ color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>{t("settings.inAppNotif")}</Text>
                    </Space>
                    <Switch checked={!!notifPrefs.inApp} onChange={(v) => saveNotifications({ inApp: v })} />
                  </div>

                  <Card
                    type="inner"
                    title={
                      <span style={{ color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>
                        {tt("settings.emailNotifGmail", "Notification Email & 2FA")}
                      </span>
                    }
                    size="small"
                    style={{ borderColor: appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder, background: appearance?.highContrast ? "#000" : undefined }}
                  >
                    <Space direction="vertical" style={{ width: "100%" }} size={12}>
                      <Text type="secondary" style={{ color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>
                        {tt("settings.emailNotifDesc", "Bind and verify an email address to receive notifications and 2FA codes.")}
                      </Text>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                        <Space.Compact style={{ flex: 1 }}>
                          <Input
                            placeholder={tt("settings.gmailPlaceholder", "name@example.com")}
                            value={gmail}
                            onChange={(e) => setGmail(e.target.value)}
                            disabled={gmailLoading}
                          />
                          <Button type="primary" onClick={handleBindGmail} loading={gmailLoading}>
                            {tt("settings.bindGmail", "Bind Email")}
                          </Button>
                        </Space.Compact>
                      </div>

                      <Space size={12}>
                        <Tag color={gmail ? "processing" : "default"}>
                          {gmail || tt("settings.gmailNotBound", "Not bound")}
                        </Tag>
                        {gmailVerified ? (
                          <Tag color="success">{tt("settings.gmailVerified", "Verified")}</Tag>
                        ) : gmail ? (
                          <Tag color="warning">{tt("settings.gmailUnverified", "Pending verification")}</Tag>
                        ) : null}
                      </Space>

                      <Divider plain>{tt("settings.gmailVerifySection", "Verify Email")}</Divider>

                      <Space direction={isMobile ? "vertical" : "horizontal"} style={{ width: "100%" }} size={12}>
                        <Button
                          type="primary"
                          onClick={handleSendGmailCode}
                          loading={gmailLoading}
                          disabled={!gmail || !validateGmail(gmail) || gmailTimer > 0}
                        >
                          {gmailTimer > 0 ? `${gmailTimer}s` : tt("settings.sendCode", "Send Code")}
                        </Button>
                        <Space.Compact style={{ flex: 1 }}>
                          <Input
                            placeholder={tt("settings.codePlaceholder", "Enter verification code")}
                            value={gmailCode}
                            onChange={(e) => setGmailCode(e.target.value)}
                            disabled={gmailLoading || !gmail}
                          />
                          <Button type="primary" onClick={handleVerifyGmail} loading={gmailLoading} disabled={!gmailCode}>
                            {tt("settings.verifyGmail", "Verify")}
                          </Button>
                        </Space.Compact>
                      </Space>

                      <Divider plain>{tt("settings.gmailEventsSection", "Notification events")}</Divider>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Space>
                          <BellOutlined style={{ fontSize: 18, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorPrimary }} />
                          <Text strong style={{ color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>
                            {tt("settings.emailNotifToggle", "External email notifications")}
                          </Text>
                        </Space>
                        <Switch
                          checked={gmailPrefs.enabled}
                          onChange={(v) => patchGmailPrefs({ enabled: v })}
                          disabled={!gmailVerified}
                        />
                      </div>

                      <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>
                        {tt("settings.gmailEventsDesc", "Choose which events will trigger email notifications.")}
                      </Text>

                      <Checkbox
                        checked={gmailPrefs.borrow}
                        disabled={!gmailPrefs.enabled || !gmailVerified}
                        onChange={(e) => patchGmailPrefs({ borrow: e.target.checked })}
                      >
                        {tt("settings.gmailEventBorrow", "When borrowing succeeds")}
                      </Checkbox>
                      <Checkbox
                        checked={gmailPrefs.return}
                        disabled={!gmailPrefs.enabled || !gmailVerified}
                        onChange={(e) => patchGmailPrefs({ return: e.target.checked })}
                      >
                        {tt("settings.gmailEventReturn", "When returning succeeds")}
                      </Checkbox>
                      <Checkbox
                        checked={gmailPrefs.requestApproved}
                        disabled={!gmailPrefs.enabled || !gmailVerified}
                        onChange={(e) => patchGmailPrefs({ requestApproved: e.target.checked })}
                      >
                        {tt("settings.gmailEventApproved", "When a borrow request is approved")}
                      </Checkbox>
                    </Space>
                  </Card>

                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
                    <Card
                      hoverable
                      onClick={() => setReminderDaysModalOpen(true)}
                      style={{ cursor: "pointer", borderColor: appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder, background: appearance?.highContrast ? "#000" : undefined }}
                    >
                      <Space align="start">
                        <CalendarOutlined style={{ fontSize: 24, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorError }} />
                        <div>
                          <Text strong style={{ display: "block", color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>{t("settings.reminderDays")}</Text>
                          <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>{t("settings.reminderDaysDesc")}</Text>
                        </div>
                      </Space>
                    </Card>
                  </div>
                </Space>
                <Modal title={t("settings.reminderDays")} open={reminderDaysModalOpen} onCancel={() => setReminderDaysModalOpen(false)} footer={null}>
                    <Radio.Group value={notifPrefs.reminderDays || 3} onChange={(e) => saveNotifications({ reminderDays: Number(e.target.value) })} style={{ width: '100%' }}>
                       <Space direction="vertical" style={{ width: '100%' }}>
                          <Radio value={1} style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>1 {t("common.day")}</Radio>
                          <Radio value={3} style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>3 {t("common.days")}</Radio>
                          <Radio value={5} style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>5 {t("common.days")}</Radio>
                       </Space>
                     </Radio.Group>
                </Modal>
              </Card>
            ),
          },
          {
            key: "borrowing",
            label: t("settings.borrowing"),
            children: (
              <Card style={{ borderRadius: token.borderRadiusLG }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.borrowing")}</Title>}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: appearance?.highContrast ? '#000' : token.colorBgLayout, borderRadius: token.borderRadius, border: '1px solid ' + (appearance?.highContrast ? '#fff' : token.colorBorder) }}>
                        <Space>
                            <CalendarOutlined style={{ fontSize: 20, color: appearance?.highContrast ? '#fff' : '#722ed1' }} />
                            <div>
                                <Text strong style={{ display: 'block', color: appearance?.highContrast ? '#fff' : undefined }}>{t("settings.defaultBorrowDuration")}</Text>
                                <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? '#fff' : undefined }}>{t("settings.defaultBorrowDurationDesc")}</Text>
                            </div>
                        </Space>
                        <Space>
                            <InputNumber 
                                min={1} 
                                max={30} 
                                value={borrowingPrefs.defaultDuration || 30} 
                                onChange={(v) => saveBorrowing({ defaultDuration: v })} 
                            />
                            <Text>{t("common.days") || "days"}</Text>
                        </Space>
                   </div>
                </Space>
              </Card>
            ),
          },
          {
            key: "account",
            label: t("settings.account") || t("settings.privacySecurity"),
            children: (
              <Card style={{ borderRadius: token.borderRadiusLG }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.account")}</Title>}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: appearance?.highContrast ? '#000' : token.colorBgLayout, borderRadius: token.borderRadius, border: '1px solid ' + (appearance?.highContrast ? '#fff' : token.colorBorder) }}>
                      <Space>
                          <SafetyCertificateOutlined style={{ fontSize: 20, color: appearance?.highContrast ? '#fff' : '#52c41a' }} />
                          <div>
                            <Text strong style={{ display: 'block', color: appearance?.highContrast ? '#fff' : undefined }}>{t("settings.twoFactor")}</Text>
                            <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? '#fff' : undefined }}>{t("settings.twoFactorDesc")}</Text>
                          </div>
                      </Space>
                      <Switch 
                        checked={!!securityPrefs.twoFactorEnabled} 
                        onChange={handleToggle2FA} 
                        disabled={!gmailVerified} 
                      />
                  </div>
                  {!gmailVerified && (
                    <Text type="danger" style={{ display: "block", marginTop: -8, marginBottom: 8 }}>
                      {t("settings.bindEmailFirst")}
                    </Text>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                    <Card
                      hoverable
                      onClick={() => {
                        console.log("Open password modal clicked (user settings)");
                        setPasswordModalOpen(true);
                      }}
                      style={{ cursor: 'pointer', borderColor: appearance?.highContrast ? '#fff' : token.colorBorder, background: appearance?.highContrast ? '#000' : undefined }}
                    >
                      <Space align="start">
                          <LockOutlined style={{ fontSize: 24, color: appearance?.highContrast ? '#fff' : '#1890ff' }} />
                          <div>
                              <Text strong style={{ display: 'block', color: appearance?.highContrast ? '#fff' : undefined }}>{t("settings.updatePassword")}</Text>
                              <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? '#fff' : undefined }}>{t("settings.updatePasswordDesc")}</Text>
                          </div>
                      </Space>
                    </Card>
                    <Card hoverable onClick={() => { setDevicesModalOpen(true); fetchSessions(); }} style={{ cursor: 'pointer', borderColor: appearance?.highContrast ? '#fff' : token.colorBorder, background: appearance?.highContrast ? '#000' : undefined }}>
                      <Space align="start">
                          <DesktopOutlined style={{ fontSize: 24, color: appearance?.highContrast ? '#fff' : '#722ed1' }} />
                          <div>
                              <Text strong style={{ display: 'block', color: appearance?.highContrast ? '#fff' : undefined }}>{t("settings.deviceManagement")}</Text>
                              <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? '#fff' : undefined }}>{t("settings.deviceManagementDesc")}</Text>
                          </div>
                      </Space>
                    </Card>
                 <Card hoverable onClick={() => { 
                        modal.confirm({
                            title: t("settings.clearCache"),
                            content: t("settings.clearCacheDesc"),
                             onOk: () => {
                                 try { localStorage.clear(); } catch (error) { void error; } 
                                 message.success(t("settings.cacheCleared"));
                             }
                         });
                     }} style={{ cursor: 'pointer', borderColor: appearance?.highContrast ? '#fff' : token.colorBorder, background: appearance?.highContrast ? '#000' : undefined }}>
                       <Space align="start">
                           <DeleteOutlined style={{ fontSize: 24, color: appearance?.highContrast ? '#fff' : '#ff4d4f' }} />
                           <div>
                               <Text strong type="danger" style={{ display: 'block', color: appearance?.highContrast ? '#fff' : undefined }}>{t("settings.clearCache")}</Text>
                               <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? '#fff' : undefined }}>{t("settings.clearCacheDesc")}</Text>
                           </div>
                       </Space>
                     </Card>
                  </div>
                </Space>
                <Modal
                    title={t("settings.updatePassword")}
                    open={passwordModalOpen}
                    onCancel={() => {
                      console.log("Password modal canceled (user settings)");
                      if (!passwordLoading) {
                        setPasswordModalOpen(false);
                      }
                    }}
                    footer={null}
                    destroyOnClose
                  >
                     <Form
                       layout="vertical"
                       onFinish={async (values) => {
                         console.log("Password change form submitted (user settings)", values);
                         const { currentPassword, newPassword, confirmPassword } = values;
                        if (!newPassword || newPassword.length < 8) {
                          modal.error({
                            title: t("settings.updatePassword"),
                            content: t("settings.passwordLength"),
                          });
                          return;
                        }
                        if (newPassword !== confirmPassword) {
                          modal.error({
                            title: t("settings.updatePassword"),
                            content: t("settings.passwordMismatch"),
                          });
                          return;
                        }
                        if (newPassword === currentPassword) {
                          modal.error({
                            title: t("settings.updatePassword"),
                            content: t("settings.samePasswordError"),
                          });
                          return;
                        }
                         
                         try { 
                           console.log("Starting password change request (user settings)...");
                           setPasswordLoading(true);
                           if (!authToken) {
        throw new Error(t("settings.notLoggedIn"));
      }
      const result = await changePassword(authToken, currentPassword, newPassword); 
                           console.log("Password change success (user settings)", result);
                           message.success(t("settings.passwordUpdated")); 
                           setPasswordModalOpen(false); 
                         } catch (e) { 
                            console.error("Change password failed (user settings):", e);
                            if (e?.response?.status === 401 || e?.response?.status === 400) {
                              modal.error({
                                title: t("settings.updatePassword"),
                                content: t("settings.wrongCurrentPassword"),
                              });
                            } else {
                              modal.error({
                                title: t("settings.updatePassword"),
                                content: e?.response?.data?.message || e?.message || t("settings.changePasswordFailed"),
                              });
                            }
                          } finally {
                           setPasswordLoading(false);
                         }
                       }}
                       onFinishFailed={(errorInfo) => {
                         console.log("Password form validation failed (user settings):", errorInfo);
                       }}
                     >
                       <Form.Item name="currentPassword" label={t("settings.currentPassword")} rules={[{ required: true, message: t("settings.enterCurrentPassword") }] }>
                         <Input.Password autoComplete="current-password" />
                       </Form.Item>
                       <Form.Item name="newPassword" label={t("settings.newPassword")} rules={[{ required: true, message: t("settings.enterNewPassword") }] }>
                         <Input.Password autoComplete="new-password" />
                       </Form.Item>
                       <Form.Item name="confirmPassword" label={t("settings.confirmPassword")} rules={[{ required: true, message: t("settings.enterConfirmPassword") }] }>
                         <Input.Password autoComplete="new-password" />
                       </Form.Item>
                       <div style={{ textAlign: 'right' }}>
                          <Button
                            onClick={() => {
                              console.log("Cancel password change clicked (user settings)");
                              setPasswordModalOpen(false);
                            }}
                            style={{ marginRight: 8 }}
                            disabled={passwordLoading}
                          >
                            {t("common.cancel")}
                          </Button>
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={passwordLoading}
                            onClick={() => {
                              console.log("Update password button clicked (user settings)");
                            }}
                          >
                            {t("settings.updatePassword")}
                          </Button>
                       </div>
                     </Form>
                  </Modal>
                <Modal
                  title={t("settings.deviceManagement")}
                  open={devicesModalOpen}
                  onCancel={() => setDevicesModalOpen(false)}
                  footer={null}
                  width={800}
                >
                   <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
                      <Text type="secondary">{t("settings.deviceManagementDesc")}</Text>
                      <Space>
                        <Button onClick={fetchSessions}>{t("settings.refreshDevices")}</Button>
                        <Button danger onClick={async () => { try { if (!authToken) { message.error(t("settings.notLoggedIn")); return; } await revokeAllSessions(authToken); message.success(t("settings.signedOutAll")); fetchSessions(); } catch (e) { message.error(e?.response?.data?.message || e?.message || t("settings.signOutAllFailed")); } }}>{t("settings.signOutAll")}</Button>
                      </Space>
                   </Space>
                   <Table loading={sessionsLoading} dataSource={sessions} size="small" pagination={false} columns={[
                     { title: t("settings.device"), dataIndex: 'device', key: 'device' },
                     { title: t("settings.ip"), dataIndex: 'ip', key: 'ip' },
                     { title: t("settings.loginTime"), dataIndex: 'loginTime', key: 'loginTime', render: (v) => new Date(v).toLocaleString() },
                     { title: t("settings.action"), key: 'action', render: (_, r) => (
                       <Button danger size="small" onClick={async () => { try { if (!authToken) { message.error(t("settings.notLoggedIn")); return; } if (!r.id) { message.error(t("settings.sessionIdMissing")); return; } await revokeSession(authToken, r.id); message.success(t("settings.signedOutDevice")); fetchSessions(); } catch (e) { message.error(e?.response?.data?.message || e?.message || t("settings.signOutDeviceFailed")); } }}>{t("assistant.remove")}</Button>
                     ) }
                   ]} />
                </Modal>
              </Card>
            ),
          },
          {
            key: "operation",
            label: t("settings.operation"),
            children: (
              <Card style={{ borderRadius: token.borderRadiusLG }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.operationPrefs")}</Title>}>
                 <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: appearance?.highContrast ? '#000' : token.colorBgContainer, borderRadius: token.borderRadius, border: '1px solid ' + (appearance?.highContrast ? '#fff' : token.colorBorder) }}>
                        <Space>
                            <SettingOutlined style={{ fontSize: 20, color: appearance?.highContrast ? '#fff' : token.colorInfo }} />
                            <Text strong style={{ color: appearance?.highContrast ? '#fff' : undefined }}>{t("settings.showAdvanced")}</Text>
                        </Space>
                        <Switch checked={!!operationPrefs.showAdvanced} onChange={(v) => saveOperation({ showAdvanced: v })} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                       <Card hoverable onClick={() => setSearchPrefModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.highContrast ? '#fff' : token.colorBorder, background: appearance?.highContrast ? '#000' : undefined }}>
                          <Space align="start">
                              <SearchOutlined style={{ fontSize: 24, color: appearance?.highContrast ? '#fff' : '#13c2c2' }} />
                              <div>
                                  <Text strong style={{ display: 'block', color: appearance?.highContrast ? '#fff' : undefined }}>{t("settings.defaultSearch")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? '#fff' : undefined }}>{t("settings.searchPrefsDesc")}</Text>
                              </div>
                          </Space>
                       </Card>
                       <Card hoverable onClick={() => setSortPrefModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.highContrast ? '#fff' : token.colorBorder, background: appearance?.highContrast ? '#000' : undefined }}>
                          <Space align="start">
                              <SortAscendingOutlined style={{ fontSize: 24, color: appearance?.highContrast ? '#fff' : '#eb2f96' }} />
                              <div>
                                  <Text strong style={{ display: 'block', color: appearance?.highContrast ? '#fff' : undefined }}>{t("settings.defaultSort")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? '#fff' : undefined }}>{t("settings.sortPrefsDesc")}</Text>
                              </div>
                          </Space>
                       </Card>
                       <Card hoverable onClick={() => setViewPrefModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.highContrast ? '#fff' : token.colorBorder, background: appearance?.highContrast ? '#000' : undefined }}>
                          <Space align="start">
                              <AppstoreOutlined style={{ fontSize: 24, color: appearance?.highContrast ? '#fff' : '#fa8c16' }} />
                              <div>
                                  <Text strong style={{ display: 'block', color: appearance?.highContrast ? '#fff' : undefined }}>{t("settings.defaultView")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? '#fff' : undefined }}>{t("settings.viewPrefsDesc")}</Text>
                              </div>
                          </Space>
                       </Card>
                    </div>
                 </Space>
                 <Modal title={t("settings.defaultSearch")} open={searchPrefModalOpen} onCancel={() => setSearchPrefModalOpen(false)} footer={null}>
                     <Radio.Group value={operationPrefs.searchBy} onChange={(e) => saveOperation({ searchBy: e.target.value })} style={{ width: '100%' }}>
                       <Space direction="vertical" style={{ width: '100%' }}>
                          <Radio value="title" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.titleOpt")}</Radio>
                          <Radio value="author" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.authorOpt")}</Radio>
                          <Radio value="category" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.categoryOpt")}</Radio>
                       </Space>
                     </Radio.Group>
                 </Modal>
                 <Modal title={t("settings.defaultSort")} open={sortPrefModalOpen} onCancel={() => setSortPrefModalOpen(false)} footer={null}>
                     <Radio.Group value={operationPrefs.sortBy} onChange={(e) => saveOperation({ sortBy: e.target.value })} style={{ width: '100%' }}>
                       <Space direction="vertical" style={{ width: '100%' }}>
                          <Radio value="latest" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.latestOpt")}</Radio>
                          <Radio value="most_borrowed" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.mostBorrowedOpt")}</Radio>
                          <Radio value="stock_high" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.stockHighOpt")}</Radio>
                       </Space>
                     </Radio.Group>
                 </Modal>
                 <Modal title={t("settings.defaultView")} open={viewPrefModalOpen} onCancel={() => setViewPrefModalOpen(false)} footer={null}>
                     <Radio.Group value={operationPrefs.view} onChange={(e) => saveOperation({ view: e.target.value })} style={{ width: '100%' }}>
                       <Space direction="vertical" style={{ width: '100%' }}>
                          <Radio value="grid" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.cardViewOpt")}</Radio>
                          <Radio value="list" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.listViewOpt")}</Radio>
                       </Space>
                     </Radio.Group>
                 </Modal>
              </Card>
            ),
          },
          {
            key: "recommend",
            label: t("settings.recommendation"),
            children: (
              <Card style={{ borderRadius: token.borderRadiusLG }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.recommendationSettings")}</Title>}>
                 <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: appearance?.highContrast ? '#000' : token.colorBgLayout, borderRadius: token.borderRadius, border: '1px solid ' + (appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder) }}>
                        <Space>
                            <TagsOutlined style={{ fontSize: 20, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorWarning }} />
                            <Text strong style={{ color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>{t("settings.autoLearn")}</Text>
                        </Space>
                        <Switch checked={!!recommendPrefs.autoLearn} onChange={(v) => saveRecommend({ autoLearn: v })} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                       <Card hoverable onClick={() => setCategoryPrefModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder, background: appearance?.highContrast ? '#000' : token.colorBgContainer }}>
                          <Space align="start">
                              <TagsOutlined style={{ fontSize: 24, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorPrimary }} />
                              <div>
                                  <Text strong style={{ display: 'block', color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>{t("settings.categoryPrefs")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorTextSecondary }}>{t("settings.categoryPrefsDesc")}</Text>
                              </div>
                          </Space>
                       </Card>
                       <Card hoverable onClick={() => { try { localStorage.removeItem('recommend_behavior'); localStorage.removeItem('compare_ids'); message.success(t("settings.dataReset")); } catch (error) { void error; } }} style={{ cursor: 'pointer', borderColor: appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder, background: appearance?.highContrast ? '#000' : token.colorBgContainer }}>
                          <Space align="start">
                              <ReloadOutlined style={{ fontSize: 24, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorError }} />
                              <div>
                                  <Text strong type="danger" style={{ display: 'block', color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>{t("settings.resetData")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorTextSecondary }}>{t("settings.resetData")}</Text>
                              </div>
                          </Space>
                       </Card>
                    </div>
                 </Space>
                 <Modal title={t("settings.categoryPrefs")} open={categoryPrefModalOpen} onCancel={() => setCategoryPrefModalOpen(false)} footer={null}>
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      <div>
                        <Text style={{ fontWeight: 600 }}>{t("settings.preferredCategories")}</Text>
                        <Select mode="multiple" allowClear placeholder={t("settings.selectPreferred")} value={recommendPrefs.preferredCategories} onChange={(vals) => saveRecommend({ preferredCategories: vals })} options={allCategories.map(c => ({ label: c, value: c }))} style={{ width: '100%', marginTop: 8 }} />
                      </div>
                      <div>
                        <Text style={{ fontWeight: 600 }}>{t("settings.excludedCategories")}</Text>
                        <Select mode="multiple" allowClear placeholder={t("settings.selectExcluded")} value={recommendPrefs.excludedCategories} onChange={(vals) => saveRecommend({ excludedCategories: vals })} options={allCategories.map(c => ({ label: c, value: c }))} style={{ width: '100%', marginTop: 8 }} />
                      </div>
                    </Space>
                 </Modal>
              </Card>
            ),
          },
          ...(user?.role === 'Administrator' ? [
            {
              key: "approval",
              label: t("settings.adminApproval"),
              children: (
                <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.adminApprovalSettings")}</Title>}>
                   <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: appearance?.highContrast ? '#000' : token.colorBgLayout, borderRadius: token.borderRadius, border: '1px solid ' + (appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder) }}>
                          <Space>
                              <BellOutlined style={{ fontSize: 20, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorSuccess }} />
                              <Text strong style={{ color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>{t("settings.approvalSound")}</Text>
                          </Space>
                          <Switch checked={!!adminApprovalPrefs.soundEnabled} onChange={(v) => saveAdminApproval({ soundEnabled: v })} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                         <Card hoverable onClick={() => setAutoRulesModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder, background: appearance?.highContrast ? '#000' : token.colorBgContainer }}>
                            <Space align="start">
                                <RobotOutlined style={{ fontSize: 24, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorPrimary }} />
                                <div>
                                    <Text strong style={{ display: 'block', color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>{t("settings.autoRules")}</Text>
                                    <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorTextSecondary }}>{t("settings.autoRulesDesc")}</Text>
                                </div>
                            </Space>
                         </Card>
                         <Card hoverable onClick={() => setBulkActionModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder, background: appearance?.highContrast ? '#000' : token.colorBgContainer }}>
                            <Space align="start">
                                <BuildOutlined style={{ fontSize: 24, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorPrimary }} />
                                <div>
                                    <Text strong style={{ display: 'block', color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>{t("settings.defaultBulkAction")}</Text>
                                    <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorTextSecondary }}>{t("settings.bulkActionDesc")}</Text>
                                </div>
                            </Space>
                         </Card>
                      </div>
                   </Space>
                   <Modal title={t("settings.autoRules")} open={autoRulesModalOpen} onCancel={() => setAutoRulesModalOpen(false)} footer={null}>
                      <Space direction="vertical" size={16} style={{ width: '100%' }}>
                        <div>
                          <Text style={{ fontWeight: 600 }}>{t("settings.autoApproveStock")}</Text>
                          <div style={{ marginTop: 8 }}>
                            <InputNumber min={0} max={99} value={adminApprovalPrefs.autoApproveWhenStockGt} onChange={(v) => saveAdminApproval({ autoApproveWhenStockGt: Number(v || 0) })} style={{ width: '100%' }} />
                          </div>
                          <Text type="secondary">{t("settings.appliesToRenew")}</Text>
                        </div>
                        <div>
                          <Text style={{ fontWeight: 600 }}>{t("settings.autoRejectOverdue")}</Text>
                          <div style={{ marginTop: 8 }}>
                            <InputNumber min={0} max={99} value={adminApprovalPrefs.autoRejectWhenOverdueGt} onChange={(v) => saveAdminApproval({ autoRejectWhenOverdueGt: Number(v || 0) })} style={{ width: '100%' }} />
                          </div>
                        </div>
                      </Space>
                   </Modal>
                   <Modal title={t("settings.defaultBulkAction")} open={bulkActionModalOpen} onCancel={() => setBulkActionModalOpen(false)} footer={null}>
                      <Radio.Group value={adminApprovalPrefs.defaultBulkAction} onChange={(e) => saveAdminApproval({ defaultBulkAction: e.target.value })} style={{ width: '100%' }}>
                         <Space direction="vertical" style={{ width: '100%' }}>
                            <Radio value="approve" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.approveOpt")}</Radio>
                            <Radio value="reject" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.rejectOpt")}</Radio>
                         </Space>
                       </Radio.Group>
                   </Modal>
                </Card>
              ),
            },
            {
              key: "roles",
              label: t("settings.roles"),
              children: (
                <Card style={{ borderRadius: token.borderRadiusLG }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.adminRolesTitle")}</Title>}>
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                     <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                         <Card hoverable onClick={() => setRolesModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.highContrast ? token.colorTextLightSolid : token.colorBorder, background: appearance?.highContrast ? '#000' : token.colorBgContainer }}>
                            <Space align="start">
                                <TeamOutlined style={{ fontSize: 24, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorInfo }} />
                                <div>
                                    <Text strong style={{ display: 'block', color: appearance?.highContrast ? token.colorTextLightSolid : undefined }}>{t("settings.manageRoles")}</Text>
                                    <Text type="secondary" style={{ fontSize: 12, color: appearance?.highContrast ? token.colorTextLightSolid : token.colorTextSecondary }}>{t("settings.manageRolesDesc")}</Text>
                                </div>
                            </Space>
                         </Card>
                     </div>
                  </Space>
                  <Modal title={t("settings.manageRoles")} open={rolesModalOpen} onCancel={() => setRolesModalOpen(false)} footer={null} width={800}>
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      <Form layout="inline" onFinish={() => {
                        const id = (permEditing.id || '').trim();
                        if (!id) { message.error(t("settings.adminIdRequired")); return; }
                        const next = { ...adminPermissions, [id]: { modules: permEditing.modules || [] } };
                        saveAdminPermissions(next);
                        setPermEditing({ id: '', modules: [] });
                        message.success(t("settings.permissionsSaved"));
                      }}>
                        <Form.Item label={t("settings.adminId")}>
                          <Input placeholder={t("settings.adminIdPlaceholder")} value={permEditing.id} onChange={(e) => setPermEditing({ ...permEditing, id: e.target.value })} style={{ width: 240 }} />
                        </Form.Item>
                        <Form.Item label={t("settings.modules")}>
                          <Checkbox.Group options={moduleOptions} value={permEditing.modules} onChange={(vals) => setPermEditing({ ...permEditing, modules: vals })} />
                        </Form.Item>
                        <Form.Item>
                          <Button type="primary" htmlType="submit">{t("settings.save")}</Button>
                        </Form.Item>
                      </Form>
                      <Table dataSource={Object.entries(adminPermissions).map(([id, v]) => ({ key: id, id, modules: (v?.modules || []) }))} size="small" pagination={false} columns={[
                        { title: t("settings.admin"), dataIndex: 'id', key: 'id' },
                        { title: t("settings.modules"), dataIndex: 'modules', key: 'modules', render: (m) => (m && m.length ? m.join(', ') : '—') },
                        { title: t("settings.action"), key: 'action', render: (_, r) => (
                          <Space>
                            <Button onClick={() => setPermEditing({ id: r.id, modules: r.modules })}>{t("settings.edit")}</Button>
                            <Button danger onClick={() => { const next = { ...adminPermissions }; delete next[r.id]; saveAdminPermissions(next); }}>{t("settings.delete")}</Button>
                          </Space>
                        ) }
                      ]} />
                    </Space>
                  </Modal>
                </Card>
              ),
            }
          ] : [])]}
      />
    </PageContainer>
  );
}

export default SettingsPage;
