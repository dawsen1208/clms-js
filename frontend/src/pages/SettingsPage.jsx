import React, { useMemo, useEffect, useState, useCallback } from "react";
import { 
  Typography, Radio, Space, Switch, Form, Button, Table, Tag, message, 
  Select, InputNumber, Tabs, Grid, Modal, Slider, Input, theme, Checkbox 
} from "antd";
import { 
  LockOutlined, DesktopOutlined, DeleteOutlined, SafetyCertificateOutlined,
  GlobalOutlined, BgColorsOutlined, FormatPainterOutlined, FontSizeOutlined, 
  CalendarOutlined, SearchOutlined, SortAscendingOutlined, AppstoreOutlined, 
  TagsOutlined, ReloadOutlined, RobotOutlined, BellOutlined, SettingOutlined, 
  PictureOutlined, SoundOutlined, BuildOutlined, TeamOutlined, RightOutlined
} from "@ant-design/icons";
import { 
  updateProfile, changePassword, getSessions, revokeSession, revokeAllSessions, 
  getBooks, sendAuthCode, bindEmail, toggle2FA 
} from "../api";
import { useLanguage } from "../contexts/LanguageContext";
import { useAccessibility } from "../contexts/AccessibilityContext";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { useToken } = theme;

const SettingRow = ({ icon, title, description, action, danger, onClick }) => {
  const { token } = useToken();
  
  return (
    <div 
      onClick={onClick}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '16px 0', 
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'start', gap: 16 }}>
        {icon && (
          <div style={{ 
            fontSize: 20, 
            color: danger ? token.colorError : token.colorPrimary,
            marginTop: 2
          }}>
            {icon}
          </div>
        )}
        <div>
          <Text strong style={{ display: 'block', fontSize: 15, color: danger ? token.colorError : token.colorText }}>
            {title}
          </Text>
          {description && (
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginTop: 4 }}>
              {description}
            </Text>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {action}
        {onClick && <RightOutlined style={{ color: token.colorTextQuaternary, fontSize: 12 }} />}
      </div>
    </div>
  );
};

function SettingsPage({ appearance, onChange, user, onUserUpdate }) {
  const { language, setLanguage, t } = useLanguage();
  const { updatePrefs } = useAccessibility();
  const { token } = useToken();
  const [modal, contextHolder] = Modal.useModal();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const handleUpdate = useCallback((updates) => {
    if (onChange) {
      onChange(prev => ({ ...prev, ...updates }));
    }
  }, [onChange]);

  // --- State: Email & Security ---
  const [email, setEmail] = useState("");
  const [boundEmail, setBoundEmail] = useState(user?.email || "");
  const [emailCode, setEmailCode] = useState("");
  const [authCodeSent, setAuthCodeSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [loadingEmail, setLoadingEmail] = useState(false);

  useEffect(() => {
    if (user?.email) setBoundEmail(user.email);
  }, [user]);

  useEffect(() => {
    let interval;
    if (timer > 0) interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const authToken = useMemo(() => sessionStorage.getItem("token") || localStorage.getItem("token"), []);

  // --- State: Preferences ---
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("notification_prefs")) || { inApp: true, email: false, reminderDays: 3 }; }
    catch { return { inApp: true, email: false, reminderDays: 3 }; }
  });

  const saveNotifications = async (patch) => {
    const next = { ...notifPrefs, ...patch };
    setNotifPrefs(next);
    try { localStorage.setItem("notification_prefs", JSON.stringify(next)); } catch {}
    try { if (authToken) await updateProfile(authToken, { preferences: { notifications: next } }); } catch {}
  };

  const [operationPrefs, setOperationPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("operation_prefs")) || { searchBy: 'title', sortBy: 'latest', view: 'list', showAdvanced: false }; }
    catch { return { searchBy: 'title', sortBy: 'latest', view: 'list', showAdvanced: false }; }
  });

  const saveOperation = async (patch) => {
    const next = { ...operationPrefs, ...patch };
    setOperationPrefs(next);
    try { localStorage.setItem("operation_prefs", JSON.stringify(next)); } catch {}
    try { if (authToken) await updateProfile(authToken, { preferences: { operation: next } }); } catch {}
  };

  const [recommendPrefs, setRecommendPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("recommend_prefs")) || { preferredCategories: [], excludedCategories: [], autoLearn: true }; }
    catch { return { preferredCategories: [], excludedCategories: [], autoLearn: true }; }
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
    try { if (authToken) await updateProfile(authToken, { preferences: { recommendation: next } }); } catch {}
  };

  const [securityPrefs, setSecurityPrefs] = useState(() => {
    if (user?.preferences?.security) return user.preferences.security;
    if (user && typeof user.is_2fa_enabled !== 'undefined') return { twoFactorEnabled: user.is_2fa_enabled };
    try { return JSON.parse(localStorage.getItem("security_prefs")) || { twoFactorEnabled: false }; }
    catch { return { twoFactorEnabled: false }; }
  });

  useEffect(() => {
    if (user?.preferences?.security) setSecurityPrefs(prev => ({ ...prev, ...user.preferences.security }));
    else if (user && typeof user.is_2fa_enabled !== 'undefined') setSecurityPrefs(prev => ({ ...prev, twoFactorEnabled: user.is_2fa_enabled }));
  }, [user]);

  const saveSecurity = async (patch) => {
    const next = { ...securityPrefs, ...patch };
    setSecurityPrefs(next);
    try { localStorage.setItem("security_prefs", JSON.stringify(next)); } catch {}
    try { if (authToken) await updateProfile(authToken, { preferences: { security: next } }); } catch {}
  };

  const [borrowingPrefs, setBorrowingPrefs] = useState(() => {
    if (user?.preferences?.borrowing) return user.preferences.borrowing;
    try { return JSON.parse(localStorage.getItem("borrowing_prefs")) || { defaultDuration: 30 }; }
    catch { return { defaultDuration: 30 }; }
  });

  const saveBorrowing = async (patch) => {
    const next = { ...borrowingPrefs, ...patch };
    setBorrowingPrefs(next);
    try { localStorage.setItem("borrowing_prefs", JSON.stringify(next)); } catch {}
    try { if (authToken) await updateProfile(authToken, { preferences: { borrowing: next } }); } catch {}
  };

  const [accessibilityPrefs, setAccessibilityPrefs] = useState(() => {
    if (user?.preferences?.accessibility) return user.preferences.accessibility;
    try { return JSON.parse(localStorage.getItem("accessibility_prefs")) || { accessibilityMode: false, ttsEnabled: false }; }
    catch { return { accessibilityMode: false, ttsEnabled: false }; }
  });

  const saveAccessibility = async (patch) => {
    const next = { ...accessibilityPrefs, ...patch };
    setAccessibilityPrefs(next);
    if (updatePrefs) updatePrefs(next);
    try { localStorage.setItem("accessibility_prefs", JSON.stringify(next)); } catch {}
    try { if (authToken) await updateProfile(authToken, { preferences: { accessibility: next } }); } catch {}
  };
  
  const [adminApprovalPrefs, setAdminApprovalPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("admin_approval_prefs")) || { autoApproveWhenStockGt: 2, autoRejectWhenOverdueGt: 3, defaultBulkAction: 'approve', soundEnabled: true }; }
    catch { return { autoApproveWhenStockGt: 2, autoRejectWhenOverdueGt: 3, defaultBulkAction: 'approve', soundEnabled: true }; }
  });

  const saveAdminApproval = async (patch) => {
    const next = { ...adminApprovalPrefs, ...patch };
    setAdminApprovalPrefs(next);
    try { localStorage.setItem("admin_approval_prefs", JSON.stringify(next)); } catch {}
    try { if (authToken) await updateProfile(authToken, { preferences: { adminApproval: next } }); } catch {}
  };
  
  const [adminPermissions, setAdminPermissions] = useState(() => {
    try { return JSON.parse(localStorage.getItem("admin_permissions")) || {}; } catch { return {}; }
  });
  
  const saveAdminPermissions = async (nextMap) => {
    setAdminPermissions(nextMap);
    try { localStorage.setItem("admin_permissions", JSON.stringify(nextMap)); } catch {}
    try { if (authToken) await updateProfile(authToken, { preferences: { adminPermissions: nextMap } }); } catch {}
  };

  // --- Modals State ---
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [devicesModalOpen, setDevicesModalOpen] = useState(false);
  const [fontSizeModalOpen, setFontSizeModalOpen] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [themeModeModalOpen, setThemeModeModalOpen] = useState(false);
  const [themeColorModalOpen, setThemeColorModalOpen] = useState(false);
  const [tempThemeColor, setTempThemeColor] = useState('');
  const [tempCustomColor, setTempCustomColor] = useState('');
  const [bgModalOpen, setBgModalOpen] = useState(false);
  const [tempBgColor, setTempBgColor] = useState('');
  const [reminderDaysModalOpen, setReminderDaysModalOpen] = useState(false);
  const [searchPrefModalOpen, setSearchPrefModalOpen] = useState(false);
  const [sortPrefModalOpen, setSortPrefModalOpen] = useState(false);
  const [viewPrefModalOpen, setViewPrefModalOpen] = useState(false);
  const [categoryPrefModalOpen, setCategoryPrefModalOpen] = useState(false);
  const [autoRulesModalOpen, setAutoRulesModalOpen] = useState(false);
  const [bulkActionModalOpen, setBulkActionModalOpen] = useState(false);
  const [rolesModalOpen, setRolesModalOpen] = useState(false);
  const [permEditing, setPermEditing] = useState({ id: "", modules: [] });

  // --- Actions ---
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
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleSendAuthCode = async () => {
    if (!email) return message.error(t("settings.enterEmail"));
    try {
      setLoadingEmail(true);
      const res = await sendAuthCode(authToken, email);
      message.success(t("settings.codeSent"));
      const responseData = res.data || {};
      if (responseData.code) {
        modal.info({
          title: "模拟邮件验证码",
          content: (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <p>您的验证码是：</p>
              <Title level={2} style={{ margin: 0, letterSpacing: 4, color: "#1677ff" }}>{responseData.code}</Title>
              <p style={{ marginTop: 10, color: "#999" }}>（此弹窗仅在模拟模式下显示）</p>
            </div>
          ),
          okText: "复制并关闭",
          onOk: () => {
             navigator.clipboard.writeText(responseData.code).then(() => { message.success("验证码已复制到剪贴板"); }).catch(() => {});
             setEmailCode(responseData.code);
          }
        });
      }
      setAuthCodeSent(true);
      setTimer(60);
    } catch (err) {
      message.error(t("settings.sendFailed"));
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleBindEmail = async () => {
    if (!emailCode) return message.error(t("settings.enterCode"));
    try {
      setLoadingEmail(true);
      await bindEmail(authToken, email, emailCode);
      message.success(t("settings.bindSuccess"));
      const storedUser = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "{}");
      storedUser.email = email;
      sessionStorage.setItem("user", JSON.stringify(storedUser));
      localStorage.setItem("user", JSON.stringify(storedUser));
      if (onUserUpdate) onUserUpdate(storedUser);
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
    if (!boundEmail && checked) return message.warning(t("settings.bindEmailFirst"));
    try {
      await toggle2FA(authToken, checked);
      saveSecurity({ twoFactorEnabled: checked });
      message.success(checked ? t("settings.2faEnabled") : t("settings.2faDisabled"));
      const storedUser = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "{}");
      storedUser.is_2fa_enabled = checked;
      if (!storedUser.preferences) storedUser.preferences = {};
      if (!storedUser.preferences.security) storedUser.preferences.security = {};
      storedUser.preferences.security.twoFactorEnabled = checked;
      sessionStorage.setItem("user", JSON.stringify(storedUser));
      localStorage.setItem("user", JSON.stringify(storedUser));
      if (onUserUpdate) onUserUpdate(storedUser);
    } catch (err) {
      message.error(t("settings.operationFailed"));
    }
  };

  const openThemeColorModal = () => {
    setTempThemeColor(appearance?.themeColor || 'blue');
    setTempCustomColor(appearance?.customColor || '#1677FF');
    setThemeColorModalOpen(true);
  };

  const confirmThemeColor = () => {
    handleUpdate({ 
        themeColor: tempThemeColor, 
        customColor: tempThemeColor === 'custom' ? tempCustomColor : (appearance?.customColor || '#1677FF')
    });
    setThemeColorModalOpen(false);
  };

  const openBgModal = () => {
    setTempBgColor(appearance?.backgroundColor || '#ffffff');
    setBgModalOpen(true);
  };

  const confirmBgColor = () => {
    handleUpdate({ backgroundColor: tempBgColor });
    setBgModalOpen(false);
  };

  const items = [
    {
      key: "general",
      label: t("settings.language"),
      children: (
        <div style={{ padding: '0 8px' }}>
          <Title level={4} style={{ marginBottom: 24 }}>{t("settings.language")}</Title>
          <SettingRow
            icon={<GlobalOutlined />}
            title={t("settings.language")}
            description={language === 'en' ? 'English' : '中文'}
            onClick={() => setLanguageModalOpen(true)}
          />
        </div>
      ),
    },
    {
      key: "appearance",
      label: t("settings.appearance"),
      children: (
        <div style={{ padding: '0 8px' }}>
          <Title level={4} style={{ marginBottom: 24 }}>{t("settings.appearance")}</Title>
          <SettingRow
            icon={<BgColorsOutlined />}
            title={t("settings.highContrast")}
            description={t("settings.highContrastDesc") || "Increase contrast for better visibility"}
            action={<Switch checked={!!appearance?.highContrast} onChange={(v) => handleUpdate({ highContrast: v })} />}
          />
          <SettingRow
            icon={<BgColorsOutlined />}
            title={t("settings.themeMode")}
            description={appearance?.mode === 'dark' ? t("settings.dark") : t("settings.light")}
            onClick={() => setThemeModeModalOpen(true)}
          />
          <SettingRow
            icon={<FormatPainterOutlined />}
            title={t("settings.themeColor")}
            description={t("settings.themeColorDesc")}
            onClick={openThemeColorModal}
          />
          <SettingRow
            icon={<FontSizeOutlined />}
            title={t("settings.fontSize")}
            description={t("settings.fontSizeDesc")}
            onClick={() => setFontSizeModalOpen(true)}
          />
          <SettingRow
            icon={<PictureOutlined />}
            title={t("settings.customBackground")}
            description={t("settings.customBackgroundDesc")}
            onClick={openBgModal}
          />
        </div>
      ),
    },
    {
      key: "accessibility",
      label: t("settings.accessibility"),
      children: (
        <div style={{ padding: '0 8px' }}>
          <Title level={4} style={{ marginBottom: 24 }}>{t("settings.accessibility")}</Title>
          <SettingRow
            icon={<SoundOutlined />}
            title={t("settings.tts") || "Text-to-Speech"}
            description={t("settings.ttsDesc")}
            action={<Switch checked={!!accessibilityPrefs.ttsEnabled} onChange={(v) => saveAccessibility({ ttsEnabled: v })} />}
          />
          <SettingRow
            icon={<RobotOutlined />}
            title={t("settings.accessibilityMode")}
            description={t("settings.accessibilityModeDesc")}
            action={
              <Switch 
                checked={!!accessibilityPrefs.accessibilityMode} 
                onChange={(v) => {
                  saveAccessibility({ accessibilityMode: v });
                  if (onChange) onChange(prev => ({ ...prev, highContrast: v, fontSize: v ? 20 : 'normal' }));
                }} 
              />
            }
          />
        </div>
      ),
    },
    {
      key: "notifications",
      label: t("settings.notifications"),
      children: (
        <div style={{ padding: '0 8px' }}>
          <Title level={4} style={{ marginBottom: 24 }}>{t("settings.notifications")}</Title>
          <SettingRow
            icon={<BellOutlined />}
            title={t("settings.inAppNotif")}
            action={<Switch checked={!!notifPrefs.inApp} onChange={(v) => saveNotifications({ inApp: v })} />}
          />
          <SettingRow
            icon={<BellOutlined />}
            title={t("settings.emailNotif")}
            action={<Switch checked={!!notifPrefs.email} onChange={(v) => saveNotifications({ email: v })} disabled={!boundEmail} />}
          />
          <SettingRow
            icon={<CalendarOutlined />}
            title={t("settings.reminderDays")}
            description={`${notifPrefs.reminderDays || 3} ${t("common.days")}`}
            onClick={() => setReminderDaysModalOpen(true)}
          />
          
          <div style={{ marginTop: 32 }}>
            <Title level={5}>{t("settings.emailConfig")}</Title>
            <div style={{ padding: 16, background: token.colorBgContainer, borderRadius: 8, border: `1px solid ${token.colorBorder}` }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>{t("settings.emailDesc")}</Text>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space.Compact style={{ width: '100%' }}>
                  <Input 
                    placeholder={t("settings.emailPlaceholder")} 
                    value={email || (boundEmail || "")} 
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button type="primary" onClick={handleSendAuthCode} disabled={timer > 0 || loadingEmail}>
                    {timer > 0 ? `${timer}s` : t("settings.sendCode")}
                  </Button>
                </Space.Compact>
                {authCodeSent && (
                  <Space.Compact style={{ width: '100%' }}>
                    <Input placeholder={t("settings.codePlaceholder")} value={emailCode} onChange={(e) => setEmailCode(e.target.value)} />
                    <Button type="primary" onClick={handleBindEmail} loading={loadingEmail}>{t("settings.bindEmail")}</Button>
                  </Space.Compact>
                )}
                {boundEmail && <Tag color="success">{t("settings.emailBound")}: {boundEmail}</Tag>}
              </Space>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "privacy",
      label: t("settings.privacySecurity"),
      children: (
        <div style={{ padding: '0 8px' }}>
          <Title level={4} style={{ marginBottom: 24 }}>{t("settings.privacySecurity")}</Title>
          <SettingRow
            icon={<SafetyCertificateOutlined />}
            title={t("settings.twoFactor")}
            description={t("settings.twoFactorDesc")}
            action={<Switch checked={!!securityPrefs.twoFactorEnabled} onChange={handleToggle2FA} disabled={!boundEmail} />}
          />
          {!boundEmail && <Text type="danger" style={{ fontSize: 12, marginTop: -8, display: 'block' }}>{t("settings.bindEmailFirst")}</Text>}
          
          <SettingRow
            icon={<LockOutlined />}
            title={t("settings.updatePassword")}
            description={t("settings.updatePasswordDesc")}
            onClick={() => setPasswordModalOpen(true)}
          />
          <SettingRow
            icon={<DesktopOutlined />}
            title={t("settings.deviceManagement")}
            description={t("settings.deviceManagementDesc")}
            onClick={() => { setDevicesModalOpen(true); fetchSessions(); }}
          />
          <SettingRow
            icon={<DeleteOutlined />}
            title={t("settings.clearCache")}
            description={t("settings.clearCacheDesc")}
            danger
            onClick={() => { 
               modal.confirm({
                   title: t("settings.clearCache"),
                   content: t("settings.clearCacheDesc"),
                   onOk: () => { try { localStorage.clear(); } catch {} message.success(t("settings.cacheCleared")); }
               });
            }}
          />
        </div>
      ),
    },
    {
      key: "operation",
      label: t("settings.operation"),
      children: (
        <div style={{ padding: '0 8px' }}>
          <Title level={4} style={{ marginBottom: 24 }}>{t("settings.operation")}</Title>
          <SettingRow
            icon={<SettingOutlined />}
            title={t("settings.showAdvanced")}
            action={<Switch checked={!!operationPrefs.showAdvanced} onChange={(v) => saveOperation({ showAdvanced: v })} />}
          />
          <SettingRow
            icon={<SearchOutlined />}
            title={t("settings.defaultSearch")}
            description={t(`settings.${operationPrefs.searchBy}Opt`) || operationPrefs.searchBy}
            onClick={() => setSearchPrefModalOpen(true)}
          />
          <SettingRow
            icon={<SortAscendingOutlined />}
            title={t("settings.defaultSort")}
            description={t(`settings.${operationPrefs.sortBy === 'most_borrowed' ? 'mostBorrowed' : operationPrefs.sortBy === 'stock_high' ? 'stockHigh' : operationPrefs.sortBy}Opt`) || operationPrefs.sortBy}
            onClick={() => setSortPrefModalOpen(true)}
          />
          <SettingRow
            icon={<AppstoreOutlined />}
            title={t("settings.defaultView")}
            description={operationPrefs.view === 'grid' ? t("settings.cardViewOpt") : t("settings.listViewOpt")}
            onClick={() => setViewPrefModalOpen(true)}
          />
          <div style={{ marginTop: 24 }}>
            <Title level={5}>{t("settings.borrowing")}</Title>
            <SettingRow
              icon={<CalendarOutlined />}
              title={t("settings.defaultBorrowDuration")}
              description={`${borrowingPrefs.defaultDuration || 30} ${t("common.days")}`}
              action={
                <Space>
                  <InputNumber min={1} max={30} value={borrowingPrefs.defaultDuration || 30} onChange={(v) => saveBorrowing({ defaultDuration: v })} />
                  <Text>{t("common.days")}</Text>
                </Space>
              }
            />
          </div>
        </div>
      ),
    },
    {
      key: "recommend",
      label: t("settings.recommendation"),
      children: (
        <div style={{ padding: '0 8px' }}>
          <Title level={4} style={{ marginBottom: 24 }}>{t("settings.recommendation")}</Title>
          <SettingRow
            icon={<TagsOutlined />}
            title={t("settings.autoLearn")}
            action={<Switch checked={!!recommendPrefs.autoLearn} onChange={(v) => saveRecommend({ autoLearn: v })} />}
          />
          <SettingRow
            icon={<TagsOutlined />}
            title={t("settings.categoryPrefs")}
            description={t("settings.categoryPrefsDesc")}
            onClick={() => setCategoryPrefModalOpen(true)}
          />
          <SettingRow
            icon={<ReloadOutlined />}
            title={t("settings.resetData")}
            danger
            onClick={() => { try { localStorage.removeItem('recommend_behavior'); localStorage.removeItem('compare_ids'); message.success(t("settings.dataReset")); } catch {} }}
          />
        </div>
      ),
    },
  ];

  if (user?.role === 'Administrator') {
    items.push({
      key: "admin",
      label: t("settings.adminApproval"),
      children: (
        <div style={{ padding: '0 8px' }}>
          <Title level={4} style={{ marginBottom: 24 }}>{t("settings.adminApproval")}</Title>
          <SettingRow
            icon={<SoundOutlined />}
            title={t("settings.approvalSound")}
            action={<Switch checked={!!adminApprovalPrefs.soundEnabled} onChange={(v) => saveAdminApproval({ soundEnabled: v })} />}
          />
          <SettingRow
            icon={<RobotOutlined />}
            title={t("settings.autoRules")}
            onClick={() => setAutoRulesModalOpen(true)}
          />
          <SettingRow
            icon={<BuildOutlined />}
            title={t("settings.bulkActions")}
            onClick={() => setBulkActionModalOpen(true)}
          />
          <SettingRow
            icon={<TeamOutlined />}
            title={t("settings.roleManagement")}
            onClick={() => setRolesModalOpen(true)}
          />
        </div>
      )
    });
  }

  return (
    <div className="settings-page" style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? 16 : 24 }}>
      {contextHolder}
      <Tabs
        defaultActiveKey="general"
        tabPosition={isMobile ? "top" : "left"}
        items={items}
        style={{ height: '100%' }}
      />

      {/* --- Modals --- */}
      <Modal title={t("settings.language")} open={languageModalOpen} onCancel={() => setLanguageModalOpen(false)} footer={null}>
        <Radio.Group value={language} onChange={(e) => setLanguage(e.target.value)} style={{ width: '100%' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio value="en" className="setting-radio-item">🇺🇸 English</Radio>
            <Radio value="zh" className="setting-radio-item">🇨🇳 中文</Radio>
          </Space>
        </Radio.Group>
      </Modal>

      <Modal title={t("settings.themeMode")} open={themeModeModalOpen} onCancel={() => setThemeModeModalOpen(false)} footer={null}>
        <Radio.Group value={appearance?.mode || 'light'} onChange={(e) => handleUpdate({ mode: e.target.value })} style={{ width: '100%' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio value="light" className="setting-radio-item">{t("settings.light")}</Radio>
            <Radio value="dark" className="setting-radio-item">{t("settings.dark")}</Radio>
          </Space>
        </Radio.Group>
      </Modal>

      <Modal 
        title={t("settings.themeColor")} 
        open={themeColorModalOpen} 
        onCancel={() => setThemeColorModalOpen(false)} 
        footer={[
          <Button key="cancel" onClick={() => setThemeColorModalOpen(false)}>{t("common.cancel")}</Button>,
          <Button key="submit" type="primary" onClick={confirmThemeColor}>{t("common.confirm")}</Button>
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Radio.Group value={tempThemeColor || 'blue'} onChange={(e) => setTempThemeColor(e.target.value)} style={{ width: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Radio value="blue">{t("settings.blue")}</Radio>
              <Radio value="purple">{t("settings.purple")}</Radio>
              <Radio value="green">{t("settings.green")}</Radio>
              <Radio value="custom">{t("settings.custom")}</Radio>
            </Space>
          </Radio.Group>
          {tempThemeColor === 'custom' && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
                {['#1677FF', '#722ED1', '#13c2c2', '#52c41a', '#eb2f96', '#f5222d', '#fa8c16', '#fadb14'].map(color => (
                  <div key={color} onClick={() => setTempCustomColor(color)} style={{ width: 32, height: 32, borderRadius: '50%', background: color, cursor: 'pointer', border: (tempCustomColor || '').toLowerCase() === color.toLowerCase() ? '2px solid #fff' : '1px solid transparent', boxShadow: (tempCustomColor || '').toLowerCase() === color.toLowerCase() ? `0 0 0 2px ${color}` : '0 2px 4px rgba(0,0,0,0.1)' }} />
                ))}
              </div>
              <Input value={tempCustomColor} onChange={(e) => setTempCustomColor(e.target.value)} placeholder="#1677FF" maxLength={9} />
            </div>
          )}
        </Space>
      </Modal>

      <Modal title={t("settings.fontSize")} open={fontSizeModalOpen} onCancel={() => setFontSizeModalOpen(false)} footer={null}>
        <div style={{ padding: '16px 8px' }}>
          <Slider min={12} max={30} value={typeof appearance?.fontSize === 'number' ? appearance.fontSize : 14} onChange={(v) => handleUpdate({ fontSize: v })} marks={{ 12: '12', 14: '14', 16: '16', 20: '20', 24: '24', 30: '30' }} />
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Text style={{ fontSize: typeof appearance?.fontSize === 'number' ? appearance.fontSize : 14 }}>{t("settings.previewText") || "Preview Text / 预览文本"}</Text>
          </div>
        </div>
      </Modal>

      <Modal 
        title={t("settings.customBackground")} 
        open={bgModalOpen} 
        onCancel={() => setBgModalOpen(false)} 
        footer={[
          <Button key="cancel" onClick={() => setBgModalOpen(false)}>{t("common.cancel")}</Button>,
          <Button key="submit" type="primary" onClick={confirmBgColor}>{t("common.confirm")}</Button>
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {['#ffffff', '#f0f2f5', '#fafafa', '#f5f5f5', '#e6f7ff', '#f9f0ff', '#f6ffed'].map(color => (
              <div key={color} onClick={() => setTempBgColor(color)} style={{ width: 32, height: 32, borderRadius: '50%', background: color, cursor: 'pointer', border: (tempBgColor || '#ffffff').toLowerCase() === color.toLowerCase() ? '2px solid #1677FF' : '1px solid #d9d9d9', boxShadow: (tempBgColor || '#ffffff').toLowerCase() === color.toLowerCase() ? `0 0 0 2px rgba(22, 119, 255, 0.2)` : 'none' }} />
            ))}
          </div>
          <Input value={tempBgColor} onChange={(e) => setTempBgColor(e.target.value)} placeholder="#ffffff" maxLength={9} />
          <Button block onClick={() => setTempBgColor("")}>{t("common.reset")}</Button>
        </Space>
      </Modal>

      <Modal title={t("settings.reminderDays")} open={reminderDaysModalOpen} onCancel={() => setReminderDaysModalOpen(false)} footer={null}>
        <Radio.Group value={notifPrefs.reminderDays || 3} onChange={(e) => saveNotifications({ reminderDays: Number(e.target.value) })} style={{ width: '100%' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio value={1}>1 {t("common.day")}</Radio>
            <Radio value={3}>3 {t("common.days")}</Radio>
            <Radio value={5}>5 {t("common.days")}</Radio>
          </Space>
        </Radio.Group>
      </Modal>

      <Modal title={t("settings.defaultSearch")} open={searchPrefModalOpen} onCancel={() => setSearchPrefModalOpen(false)} footer={null}>
        <Radio.Group value={operationPrefs.searchBy} onChange={(e) => saveOperation({ searchBy: e.target.value })} style={{ width: '100%' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio value="title">{t("settings.titleOpt")}</Radio>
            <Radio value="author">{t("settings.authorOpt")}</Radio>
            <Radio value="category">{t("settings.categoryOpt")}</Radio>
          </Space>
        </Radio.Group>
      </Modal>

      <Modal title={t("settings.defaultSort")} open={sortPrefModalOpen} onCancel={() => setSortPrefModalOpen(false)} footer={null}>
        <Radio.Group value={operationPrefs.sortBy} onChange={(e) => saveOperation({ sortBy: e.target.value })} style={{ width: '100%' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio value="latest">{t("settings.latestOpt")}</Radio>
            <Radio value="most_borrowed">{t("settings.mostBorrowedOpt")}</Radio>
            <Radio value="stock_high">{t("settings.stockHighOpt")}</Radio>
          </Space>
        </Radio.Group>
      </Modal>

      <Modal title={t("settings.defaultView")} open={viewPrefModalOpen} onCancel={() => setViewPrefModalOpen(false)} footer={null}>
        <Radio.Group value={operationPrefs.view} onChange={(e) => saveOperation({ view: e.target.value })} style={{ width: '100%' }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio value="grid">{t("settings.cardViewOpt")}</Radio>
            <Radio value="list">{t("settings.listViewOpt")}</Radio>
          </Space>
        </Radio.Group>
      </Modal>

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

      {/* Admin Modals */}
      <Modal title={t("settings.autoRules")} open={autoRulesModalOpen} onCancel={() => setAutoRulesModalOpen(false)} footer={null}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>{t("settings.autoApproveStock")}</Text>
            <InputNumber min={0} value={adminApprovalPrefs.autoApproveWhenStockGt} onChange={(v) => saveAdminApproval({ autoApproveWhenStockGt: v })} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>{t("settings.autoRejectOverdue")}</Text>
            <InputNumber min={0} value={adminApprovalPrefs.autoRejectWhenOverdueGt} onChange={(v) => saveAdminApproval({ autoRejectWhenOverdueGt: v })} />
          </div>
        </Space>
      </Modal>

      <Modal title={t("settings.bulkActions")} open={bulkActionModalOpen} onCancel={() => setBulkActionModalOpen(false)} footer={null}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>{t("settings.defaultBulkAction")}</Text>
          <Select value={adminApprovalPrefs.defaultBulkAction} onChange={(v) => saveAdminApproval({ defaultBulkAction: v })} options={[{ label: t("admin.approve"), value: 'approve' }, { label: t("admin.reject"), value: 'reject' }]} style={{ width: 120 }} />
        </div>
      </Modal>

      <Modal title={t("settings.roleManagement")} open={rolesModalOpen} onCancel={() => setRolesModalOpen(false)} footer={null} width={600}>
        <Table 
          dataSource={[{ id: 'admin', name: 'Administrator' }, { id: 'user', name: 'User' }]} 
          rowKey="id" 
          pagination={false} 
          columns={[
            { title: t("admin.role"), dataIndex: 'name' },
            { 
              title: t("settings.permissions"), 
              render: (_, r) => (
                <Button type="link" onClick={() => {
                   const current = adminPermissions[r.id] || [];
                   setPermEditing({ id: r.id, modules: current });
                }}>{t("common.edit")}</Button>
              ) 
            }
          ]} 
        />
        {permEditing.id && (
          <div style={{ marginTop: 24, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
             <Text strong>{t("settings.editingPermissions")}: {permEditing.id}</Text>
             <Checkbox.Group 
               style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}
               options={[
                 { label: t("admin.dashboard"), value: "home" },
                 { label: t("common.bookSearch"), value: "book" },
                 { label: t("common.borrowManage"), value: "borrow" },
                 { label: t("admin.history"), value: "history" },
                 { label: t("admin.userManage"), value: "users" },
                 { label: t("common.profile"), value: "profile" },
                 { label: t("common.settings"), value: "settings" },
               ]}
               value={permEditing.modules}
               onChange={(vals) => setPermEditing(prev => ({ ...prev, modules: vals }))}
             />
             <Button type="primary" style={{ marginTop: 16 }} onClick={() => {
               saveAdminPermissions({ ...adminPermissions, [permEditing.id]: permEditing.modules });
               setPermEditing({ id: "", modules: [] });
               message.success(t("common.success"));
             }}>{t("common.save")}</Button>
          </div>
        )}
      </Modal>

      <Modal
        title={t("settings.updatePassword")}
        open={passwordModalOpen}
        onCancel={() => !passwordLoading && setPasswordModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form
          layout="vertical"
          onFinish={async (values) => {
            const { currentPassword, newPassword, confirmPassword } = values;
            if (!newPassword || newPassword.length < 8) return modal.error({ title: t("settings.updatePassword"), content: t("settings.passwordLength") });
            if (newPassword !== confirmPassword) return modal.error({ title: t("settings.updatePassword"), content: t("settings.passwordMismatch") });
            if (newPassword === currentPassword) return modal.error({ title: t("settings.updatePassword"), content: t("settings.samePasswordError") });
            
            try { 
              setPasswordLoading(true);
              if (!authToken) throw new Error(t("settings.notLoggedIn"));
              await changePassword(authToken, currentPassword, newPassword); 
              message.success(t("settings.passwordUpdated")); 
              setPasswordModalOpen(false); 
            } catch (e) { 
               const msg = (e?.response?.status === 401 || e?.response?.status === 400) ? t("settings.wrongCurrentPassword") : (e?.response?.data?.message || e?.message || t("settings.changePasswordFailed"));
               modal.error({ title: t("settings.updatePassword"), content: msg });
            } finally {
              setPasswordLoading(false);
            }
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
             <Button onClick={() => setPasswordModalOpen(false)} style={{ marginRight: 8 }} disabled={passwordLoading}>{t("common.cancel")}</Button>
             <Button type="primary" htmlType="submit" loading={passwordLoading}>{t("settings.updatePassword")}</Button>
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
            <Button danger onClick={async () => { try { if (!authToken) return message.error(t("settings.notLoggedIn")); await revokeAllSessions(authToken); message.success(t("settings.signedOutAll")); fetchSessions(); } catch (e) { message.error(e?.response?.data?.message || e?.message || t("settings.signOutAllFailed")); } }}>{t("settings.signOutAll")}</Button>
          </Space>
        </Space>
        <Table loading={sessionsLoading} dataSource={sessions} size="small" pagination={false} columns={[
          { title: t("settings.device"), dataIndex: 'device', key: 'device' },
          { title: t("settings.ip"), dataIndex: 'ip', key: 'ip' },
          { title: t("settings.loginTime"), dataIndex: 'loginTime', key: 'loginTime', render: (v) => new Date(v).toLocaleString() },
          { title: t("settings.action"), key: 'action', render: (_, r) => (
            <Button danger size="small" onClick={async () => { try { if (!authToken) return message.error(t("settings.notLoggedIn")); if (!r.id) return message.error(t("settings.sessionIdMissing")); await revokeSession(authToken, r.id); message.success(t("settings.signedOutDevice")); fetchSessions(); } catch (e) { message.error(e?.response?.data?.message || e?.message || t("settings.signOutDeviceFailed")); } }}>{t("assistant.remove")}</Button>
          ) }
        ]} />
      </Modal>
    </div>
  );
}

export default SettingsPage;
