import React, { useMemo, useEffect, useState } from "react";
import { Card, Typography, Radio, Space, Divider, Input, Switch, Form, Button, Table, Tag, message, Select, InputNumber, Checkbox, Tabs, Grid, Modal, ColorPicker } from "antd";
import { 
  LockOutlined, DesktopOutlined, DeleteOutlined, SafetyCertificateOutlined,
  GlobalOutlined, BgColorsOutlined, FormatPainterOutlined, FontSizeOutlined, 
  CalendarOutlined, SearchOutlined, SortAscendingOutlined, AppstoreOutlined, 
  TagsOutlined, ReloadOutlined, RobotOutlined, BuildOutlined, TeamOutlined,
  BellOutlined, SettingOutlined, PictureOutlined
} from "@ant-design/icons";
import { updateProfile, changePassword, getSessions, revokeSession, revokeAllSessions, getBooks, sendAuthCode, bindEmail, toggle2FA } from "../api";
import { useLanguage } from "../contexts/LanguageContext"; // ✅ Import Hook

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

function SettingsPage({ appearance, onChange, user }) {
  const { language, setLanguage, t } = useLanguage(); // ✅ Use Language Hook
  const [modal, contextHolder] = Modal.useModal();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [email, setEmail] = useState("");
  const [boundEmail, setBoundEmail] = useState(user?.email || "");
  const [emailCode, setEmailCode] = useState("");
  const [authCodeSent, setAuthCodeSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [loadingEmail, setLoadingEmail] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setBoundEmail(user.email);
    }
  }, [user]);

  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const token = useMemo(() => {
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
    try { localStorage.setItem("notification_prefs", JSON.stringify(next)); } catch {}
    try {
      if (token) {
        await updateProfile(token, { preferences: { notifications: next } });
      }
    } catch {}
  };

  const handleSendAuthCode = async () => {
    if (!email) {
      message.error(t("settings.enterEmail"));
      return;
    }
    try {
      setLoadingEmail(true);
      await sendAuthCode(token, email);
      message.success(t("settings.codeSent"));
      setAuthCodeSent(true);
      setTimer(60);
    } catch (err) {
      message.error(t("settings.sendFailed"));
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleBindEmail = async () => {
    if (!emailCode) {
      message.error(t("settings.enterCode"));
      return;
    }
    try {
      setLoadingEmail(true);
      await bindEmail(token, email, emailCode);
      message.success(t("settings.bindSuccess"));
      
      const storedUser = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "{}");
      storedUser.email = email;
      sessionStorage.setItem("user", JSON.stringify(storedUser));
      localStorage.setItem("user", JSON.stringify(storedUser));
      
      setBoundEmail(email);

      setAuthCodeSent(false);
      setEmailCode("");
      setTimer(0);
    } catch (err) {
      message.error(t("settings.bindFailed"));
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleToggle2FA = async (checked) => {
    // Check if email is bound first
    if (!boundEmail && checked) {
      message.warning(t("settings.bindEmailFirst"));
      return;
    }

    try {
      await toggle2FA(token, checked);
      saveSecurity({ twoFactorEnabled: checked });
      message.success(checked ? t("settings.2faEnabled") : t("settings.2faDisabled"));
    } catch (err) {
      message.error(t("settings.operationFailed"));
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
    try { localStorage.setItem("operation_prefs", JSON.stringify(next)); } catch {}
    try {
      if (token) {
        await updateProfile(token, { preferences: { operation: next } });
      }
    } catch {}
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
      } catch {}
    })();
  }, []);

  const saveRecommend = async (patch) => {
    const next = { ...recommendPrefs, ...patch };
    setRecommendPrefs(next);
    try { localStorage.setItem("recommend_prefs", JSON.stringify(next)); } catch {}
    try {
      if (token) {
        await updateProfile(token, { preferences: { recommendation: next } });
      }
    } catch {}
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
    try { localStorage.setItem("admin_approval_prefs", JSON.stringify(next)); } catch {}
    try {
      if (token) {
        await updateProfile(token, { preferences: { adminApproval: next } });
      }
    } catch {}
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
    try { localStorage.setItem("admin_permissions", JSON.stringify(nextMap)); } catch {}
    try {
      if (token) {
        await updateProfile(token, { preferences: { adminPermissions: nextMap } });
      }
    } catch {}
  };

  const [securityPrefs, setSecurityPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem("security_prefs");
      return raw ? JSON.parse(raw) : { twoFactorEnabled: false };
    } catch {
      return { twoFactorEnabled: false };
    }
  });

  const saveSecurity = async (patch) => {
    const next = { ...securityPrefs, ...patch };
    setSecurityPrefs(next);
    try { localStorage.setItem("security_prefs", JSON.stringify(next)); } catch {}
    try {
      if (token) {
        await updateProfile(token, { preferences: { security: next } });
      }
    } catch {}
  };

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [devicesModalOpen, setDevicesModalOpen] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [themeModeModalOpen, setThemeModeModalOpen] = useState(false);
  const [themeColorModalOpen, setThemeColorModalOpen] = useState(false);
  const [fontSizeModalOpen, setFontSizeModalOpen] = useState(false);
  const [bgModalOpen, setBgModalOpen] = useState(false);
  const [reminderDaysModalOpen, setReminderDaysModalOpen] = useState(false);
  const [searchPrefModalOpen, setSearchPrefModalOpen] = useState(false);
  const [sortPrefModalOpen, setSortPrefModalOpen] = useState(false);
  const [viewPrefModalOpen, setViewPrefModalOpen] = useState(false);
  const [categoryPrefModalOpen, setCategoryPrefModalOpen] = useState(false);
  const [autoRulesModalOpen, setAutoRulesModalOpen] = useState(false);
  const [bulkActionModalOpen, setBulkActionModalOpen] = useState(false);
  const [rolesModalOpen, setRolesModalOpen] = useState(false);

  const fetchSessions = async () => {
    if (!token) return;
    setSessionsLoading(true);
    try {
      const res = await getSessions(token);
      const list = Array.isArray(res?.data) ? res.data : (res?.data?.sessions || []);
      setSessions(list.map((s) => ({
        key: s.id || s._id || `${s.device}-${s.ip}-${s.loginTime}`,
        device: s.device || s.userAgent || t("common.unknown"),
        ip: s.ip || s.ipAddress || "-",
        loginTime: s.loginTime || s.createdAt || s.lastUsedAt || Date.now(),
        id: s.id || s._id,
      })));
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  // avoid auto-calling session endpoint to prevent 404 in dev when backend not implemented

  const handleUpdate = (patch) => {
    onChange?.({ ...appearance, ...patch });
  };

  return (
    <div className="settings-page" style={{ padding: isMobile ? "16px" : "24px", maxWidth: 1000, margin: "0 auto" }}>
      {contextHolder}
      <Title level={2} className="page-modern-title" style={{ marginBottom: 24, fontSize: isMobile ? 24 : 30 }}>{t("settings.settings")}</Title>
      <Tabs
        defaultActiveKey="language"
        tabPosition={isMobile ? "top" : "left"}
        items={[
          {
            key: "language",
            label: t("settings.language"),
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={4} style={{ margin: 0 }}>{t("settings.language")}</Title>}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                  <Card hoverable onClick={() => setLanguageModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}>
                    <Space align="start">
                        <GlobalOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                        <div>
                            <Text strong style={{ display: 'block' }}>{t("settings.language")}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.languageDesc")}</Text>
                        </div>
                    </Space>
                  </Card>
                </div>
                <Modal title={t("settings.language")} open={languageModalOpen} onCancel={() => setLanguageModalOpen(false)} footer={null}>
                   <Radio.Group value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: '100%' }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Radio value="en" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>🇺🇸 English</Radio>
                        <Radio value="zh" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>🇨🇳 中文</Radio>
                      </Space>
                   </Radio.Group>
                </Modal>
              </Card>
            ),
          },
          {
            key: "appearance",
            label: t("settings.appearance"),
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={4} style={{ margin: 0 }}>{t("settings.appearance")}</Title>}>
                 <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: appearance?.mode === 'dark' ? '#1f1f1f' : '#f9f9f9', borderRadius: 8, border: '1px solid ' + (appearance?.mode === 'dark' ? '#303030' : '#f0f0f0') }}>
                        <Space>
                            <BgColorsOutlined style={{ fontSize: 20, color: '#faad14' }} />
                            <Text strong>{t("settings.highContrast")}</Text>
                        </Space>
                        <Switch checked={!!appearance?.highContrast} onChange={(v) => handleUpdate({ highContrast: v })} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                       <Card hoverable onClick={() => setThemeModeModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}>
                          <Space align="start">
                              <BgColorsOutlined style={{ fontSize: 24, color: '#13c2c2' }} />
                              <div>
                                  <Text strong style={{ display: 'block' }}>{t("settings.themeMode")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.themeModeDesc")}</Text>
                              </div>
                          </Space>
                       </Card>
                       <Card hoverable onClick={() => setThemeColorModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}>
                          <Space align="start">
                              <FormatPainterOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                              <div>
                                  <Text strong style={{ display: 'block' }}>{t("settings.themeColor")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.themeColorDesc")}</Text>
                              </div>
                          </Space>
                       </Card>
                       <Card hoverable onClick={() => setFontSizeModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}>
                          <Space align="start">
                              <FontSizeOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                              <div>
                                  <Text strong style={{ display: 'block' }}>{t("settings.fontSize")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.fontSizeDesc")}</Text>
                              </div>
                          </Space>
                       </Card>
                       <Card hoverable onClick={() => setBgModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}>
                          <Space align="start">
                              <PictureOutlined style={{ fontSize: 24, color: '#eb2f96' }} />
                              <div>
                                  <Text strong style={{ display: 'block' }}>{t("settings.customBackground")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.customBackgroundDesc")}</Text>
                              </div>
                          </Space>
                       </Card>
                    </div>
                 </Space>
                 <Modal title={t("settings.themeMode")} open={themeModeModalOpen} onCancel={() => setThemeModeModalOpen(false)} footer={null}>
                     <Radio.Group value={appearance?.mode || 'light'} onChange={(e) => handleUpdate({ mode: e.target.value })} style={{ width: '100%' }}>
                       <Space direction="vertical" style={{ width: '100%' }}>
                          <Radio value="light" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.light")}</Radio>
                          <Radio value="dark" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.dark")}</Radio>
                       </Space>
                     </Radio.Group>
                 </Modal>
                 <Modal title={t("settings.themeColor")} open={themeColorModalOpen} onCancel={() => setThemeColorModalOpen(false)} footer={null}>
                     <Radio.Group value={appearance?.themeColor || 'blue'} onChange={(e) => handleUpdate({ themeColor: e.target.value })} style={{ width: '100%' }}>
                       <Space direction="vertical" style={{ width: '100%' }}>
                          <Radio value="blue" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.blue")}</Radio>
                          <Radio value="purple" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.purple")}</Radio>
                          <Radio value="green" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.green")}</Radio>
                          <Radio value="custom" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.custom")}</Radio>
                       </Space>
                     </Radio.Group>
                     {appearance?.themeColor === 'custom' && (
                        <div style={{ marginTop: 16 }}>
                           <ColorPicker value={appearance?.customColor || '#1677FF'} onChange={(c) => handleUpdate({ customColor: c.toHexString() })} showText />
                        </div>
                     )}
                 </Modal>
                 <Modal title={t("settings.fontSize")} open={fontSizeModalOpen} onCancel={() => setFontSizeModalOpen(false)} footer={null}>
                     <Radio.Group value={appearance?.fontSize || 'normal'} onChange={(e) => handleUpdate({ fontSize: e.target.value })} style={{ width: '100%' }}>
                       <Space direction="vertical" style={{ width: '100%' }}>
                          <Radio value="normal" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.normal")}</Radio>
                          <Radio value="large" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("settings.large")}</Radio>
                       </Space>
                     </Radio.Group>
                 </Modal>
                 <Modal title={t("settings.customBackground")} open={bgModalOpen} onCancel={() => setBgModalOpen(false)} footer={null}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                       <ColorPicker 
                         value={appearance?.backgroundColor || '#ffffff'} 
                         onChange={(c) => {
                           const colorHex = typeof c === 'string' ? c : c.toHexString();
                           handleUpdate({ backgroundColor: colorHex });
                         }} 
                         showText 
                         style={{ width: '100%' }} 
                       />
                       <Button onClick={() => handleUpdate({ backgroundColor: "" })}>{t("common.reset")}</Button>
                    </Space>
                 </Modal>
              </Card>
            ),
          },
          {
            key: "notifications",
            label: t("settings.notifications"),
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.notifications")}</Title>}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: appearance?.mode === 'dark' ? '#1f1f1f' : '#f9f9f9', borderRadius: 8, border: '1px solid ' + (appearance?.mode === 'dark' ? '#303030' : '#f0f0f0') }}>
                        <Space>
                            <BellOutlined style={{ fontSize: 20, color: '#faad14' }} />
                            <Text strong>{t("settings.inAppNotif")}</Text>
                        </Space>
                        <Switch checked={!!notifPrefs.inApp} onChange={(v) => saveNotifications({ inApp: v })} />
                   </div>

                   {/* Email Binding Section */}
                   <Card type="inner" title={t("settings.emailConfig")} size="small" style={{ borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Text type="secondary">{t("settings.emailDesc")}</Text>
                        <Space.Compact style={{ width: '100%' }}>
                          <Input 
                            placeholder={t("settings.emailPlaceholder")} 
                            value={email || (boundEmail || "")} 
                            onChange={(e) => setEmail(e.target.value)}
                            // disabled={!!boundEmail && !authCodeSent} 
                          />
                          <Button type="primary" onClick={handleSendAuthCode} disabled={timer > 0 || loadingEmail}>
                            {timer > 0 ? `${timer}s` : t("settings.sendCode")}
                          </Button>
                        </Space.Compact>
                        {authCodeSent && (
                           <Space.Compact style={{ width: '100%' }}>
                             <Input 
                               placeholder={t("settings.codePlaceholder")} 
                               value={emailCode} 
                               onChange={(e) => setEmailCode(e.target.value)} 
                             />
                             <Button type="primary" onClick={handleBindEmail} loading={loadingEmail}>
                               {t("settings.bindEmail")}
                             </Button>
                           </Space.Compact>
                        )}
                        {boundEmail && <Tag color="success">{t("settings.emailBound")}: {boundEmail}</Tag>}
                      </Space>
                   </Card>

                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: appearance?.mode === 'dark' ? '#1f1f1f' : '#f9f9f9', borderRadius: 8, border: '1px solid ' + (appearance?.mode === 'dark' ? '#303030' : '#f0f0f0') }}>
                        <Space>
                            <BellOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                            <Text strong>{t("settings.emailNotif")}</Text>
                        </Space>
                        <Switch checked={!!notifPrefs.email} onChange={(v) => saveNotifications({ email: v })} disabled={!boundEmail} />
                   </div>
                   <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                       <Card hoverable onClick={() => setReminderDaysModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}>
                          <Space align="start">
                              <CalendarOutlined style={{ fontSize: 24, color: '#f5222d' }} />
                              <div>
                                  <Text strong style={{ display: 'block' }}>{t("settings.reminderDays")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.reminderDaysDesc")}</Text>
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
            key: "privacy",
            label: t("settings.privacySecurity"),
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.privacySecurity")}</Title>}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: appearance?.mode === 'dark' ? '#1f1f1f' : '#f9f9f9', borderRadius: 8, border: '1px solid ' + (appearance?.mode === 'dark' ? '#303030' : '#f0f0f0') }}>
                      <Space>
                          <SafetyCertificateOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                          <div>
                            <Text strong style={{ display: 'block' }}>{t("settings.twoFactor")}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.twoFactorDesc")}</Text>
                          </div>
                      </Space>
                      <Switch 
                        checked={!!securityPrefs.twoFactorEnabled} 
                        onChange={handleToggle2FA} 
                        disabled={!boundEmail} 
                      />
                  </div>
                  {!boundEmail && <Text type="danger" style={{ display: 'block', marginTop: -8, marginBottom: 8 }}>{t("settings.bindEmailFirst")}</Text>}
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                    <Card
                      hoverable
                      onClick={() => {
                        console.log("Open password modal clicked (user settings)");
                        setPasswordModalOpen(true);
                      }}
                      style={{ cursor: 'pointer', borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}
                    >
                      <Space align="start">
                          <LockOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                          <div>
                              <Text strong style={{ display: 'block' }}>{t("settings.updatePassword")}</Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.updatePasswordDesc")}</Text>
                          </div>
                      </Space>
                    </Card>
                    <Card hoverable onClick={() => { setDevicesModalOpen(true); fetchSessions(); }} style={{ cursor: 'pointer', borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}>
                      <Space align="start">
                          <DesktopOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                          <div>
                              <Text strong style={{ display: 'block' }}>{t("settings.deviceManagement")}</Text>
                              <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.deviceManagementDesc")}</Text>
                          </div>
                      </Space>
                    </Card>
                     <Card hoverable onClick={() => { 
                        modal.confirm({
                            title: t("settings.clearCache"),
                            content: t("settings.clearCacheDesc"),
                             onOk: () => {
                                 try { localStorage.clear(); } catch {} 
                                 message.success(t("settings.cacheCleared"));
                             }
                         });
                     }} style={{ cursor: 'pointer', borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}>
                       <Space align="start">
                           <DeleteOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                           <div>
                               <Text strong type="danger" style={{ display: 'block' }}>{t("settings.clearCache")}</Text>
                               <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.clearCacheDesc")}</Text>
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
                           if (!token) { throw new Error(t("settings.notLoggedIn")); } 
                           const result = await changePassword(token, currentPassword, newPassword); 
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
                        <Button danger onClick={async () => { try { if (!token) { message.error(t("settings.notLoggedIn")); return; } await revokeAllSessions(token); message.success(t("settings.signedOutAll")); fetchSessions(); } catch (e) { message.error(e?.response?.data?.message || e?.message || t("settings.signOutAllFailed")); } }}>{t("settings.signOutAll")}</Button>
                      </Space>
                   </Space>
                   <Table loading={sessionsLoading} dataSource={sessions} size="small" pagination={false} columns={[
                     { title: t("settings.device"), dataIndex: 'device', key: 'device' },
                     { title: t("settings.ip"), dataIndex: 'ip', key: 'ip' },
                     { title: t("settings.loginTime"), dataIndex: 'loginTime', key: 'loginTime', render: (v) => new Date(v).toLocaleString() },
                     { title: t("settings.action"), key: 'action', render: (_, r) => (
                       <Button danger size="small" onClick={async () => { try { if (!token) { message.error(t("settings.notLoggedIn")); return; } if (!r.id) { message.error(t("settings.sessionIdMissing")); return; } await revokeSession(token, r.id); message.success(t("settings.signedOutDevice")); fetchSessions(); } catch (e) { message.error(e?.response?.data?.message || e?.message || t("settings.signOutDeviceFailed")); } }}>{t("assistant.remove")}</Button>
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
              <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.operationPrefs")}</Title>}>
                 <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: appearance?.mode === 'dark' ? '#1f1f1f' : '#f9f9f9', borderRadius: 8, border: '1px solid ' + (appearance?.mode === 'dark' ? '#303030' : '#f0f0f0') }}>
                        <Space>
                            <SettingOutlined style={{ fontSize: 20, color: '#722ed1' }} />
                            <Text strong>{t("settings.showAdvanced")}</Text>
                        </Space>
                        <Switch checked={!!operationPrefs.showAdvanced} onChange={(v) => saveOperation({ showAdvanced: v })} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                       <Card hoverable onClick={() => setSearchPrefModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}>
                          <Space align="start">
                              <SearchOutlined style={{ fontSize: 24, color: '#13c2c2' }} />
                              <div>
                                  <Text strong style={{ display: 'block' }}>{t("settings.defaultSearch")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.searchPrefsDesc")}</Text>
                              </div>
                          </Space>
                       </Card>
                       <Card hoverable onClick={() => setSortPrefModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}>
                          <Space align="start">
                              <SortAscendingOutlined style={{ fontSize: 24, color: '#eb2f96' }} />
                              <div>
                                  <Text strong style={{ display: 'block' }}>{t("settings.defaultSort")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.sortPrefsDesc")}</Text>
                              </div>
                          </Space>
                       </Card>
                       <Card hoverable onClick={() => setViewPrefModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}>
                          <Space align="start">
                              <AppstoreOutlined style={{ fontSize: 24, color: '#fa8c16' }} />
                              <div>
                                  <Text strong style={{ display: 'block' }}>{t("settings.defaultView")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.viewPrefsDesc")}</Text>
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
              <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.recommendationSettings")}</Title>}>
                 <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: appearance?.mode === 'dark' ? '#1f1f1f' : '#f9f9f9', borderRadius: 8, border: '1px solid ' + (appearance?.mode === 'dark' ? '#303030' : '#f0f0f0') }}>
                        <Space>
                            <TagsOutlined style={{ fontSize: 20, color: '#faad14' }} />
                            <Text strong>{t("settings.autoLearn")}</Text>
                        </Space>
                        <Switch checked={!!recommendPrefs.autoLearn} onChange={(v) => saveRecommend({ autoLearn: v })} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                       <Card hoverable onClick={() => setCategoryPrefModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}>
                          <Space align="start">
                              <TagsOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                              <div>
                                  <Text strong style={{ display: 'block' }}>{t("settings.categoryPrefs")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.categoryPrefsDesc")}</Text>
                              </div>
                          </Space>
                       </Card>
                       <Card hoverable onClick={() => { try { localStorage.removeItem('recommend_behavior'); localStorage.removeItem('compare_ids'); message.success(t("settings.dataReset")); } catch {} }} style={{ cursor: 'pointer', borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}>
                          <Space align="start">
                              <ReloadOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                              <div>
                                  <Text strong type="danger" style={{ display: 'block' }}>{t("settings.resetData")}</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.resetData")}</Text>
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
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: appearance?.mode === 'dark' ? '#1f1f1f' : '#f9f9f9', borderRadius: 8, border: '1px solid ' + (appearance?.mode === 'dark' ? '#303030' : '#f0f0f0') }}>
                          <Space>
                              <BellOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                              <Text strong>{t("settings.approvalSound")}</Text>
                          </Space>
                          <Switch checked={!!adminApprovalPrefs.soundEnabled} onChange={(v) => saveAdminApproval({ soundEnabled: v })} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                         <Card hoverable onClick={() => setAutoRulesModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}>
                            <Space align="start">
                                <RobotOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                                <div>
                                    <Text strong style={{ display: 'block' }}>{t("settings.autoRules")}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.autoRulesDesc")}</Text>
                                </div>
                            </Space>
                         </Card>
                         <Card hoverable onClick={() => setBulkActionModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}>
                            <Space align="start">
                                <BuildOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                                <div>
                                    <Text strong style={{ display: 'block' }}>{t("settings.defaultBulkAction")}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.bulkActionDesc")}</Text>
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
                <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.adminRolesTitle")}</Title>}>
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                     <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                         <Card hoverable onClick={() => setRolesModalOpen(true)} style={{ cursor: 'pointer', borderColor: appearance?.mode === 'dark' ? '#303030' : '#f0f0f0' }}>
                            <Space align="start">
                                <TeamOutlined style={{ fontSize: 24, color: '#13c2c2' }} />
                                <div>
                                    <Text strong style={{ display: 'block' }}>{t("settings.manageRoles")}</Text>
                                    <Text type="secondary" style={{ fontSize: 12 }}>{t("settings.manageRolesDesc")}</Text>
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
    </div>
  );
}

export default SettingsPage;
