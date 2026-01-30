import React, { useMemo, useEffect, useState } from "react";
import { Card, Typography, Radio, Space, Input, Switch, Form, Button, Table, message, Select, InputNumber, Checkbox, Tabs, Grid, Modal, ColorPicker, Slider, theme } from "antd";
import { 
  LockOutlined, DesktopOutlined, DeleteOutlined, SafetyCertificateOutlined,
  GlobalOutlined, BgColorsOutlined, FormatPainterOutlined, FontSizeOutlined, 
  PictureOutlined, RobotOutlined, BuildOutlined, TeamOutlined, BellOutlined
} from "@ant-design/icons";
import { updateProfile, changePassword, getSessions, revokeSession, revokeAllSessions } from "../api";
import { useLanguage } from "../contexts/LanguageContext";

const { Title, Text: AntText } = Typography;
const { useBreakpoint } = Grid;
const { useToken } = theme;

function AdminSettingsPage({ appearance, onChange, user }) {
  const { language, setLanguage, t } = useLanguage();
  const { token } = useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [form] = Form.useForm();

  const authToken = useMemo(() => {
    return sessionStorage.getItem("token") || localStorage.getItem("token");
  }, []);

  // --- Admin Approval Prefs ---
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
      if (authToken) {
        await updateProfile(authToken, { preferences: { adminApproval: next } });
      }
    } catch {}
  };

  // --- Admin Permissions ---
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
      if (authToken) {
        await updateProfile(authToken, { preferences: { adminPermissions: nextMap } });
      }
    } catch {}
  };

  // --- Security Prefs ---
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
      if (authToken) {
        await updateProfile(authToken, { preferences: { security: next } });
      }
    } catch {}
  };

  // --- Modals State ---
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [devicesModalOpen, setDevicesModalOpen] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [themeModeModalOpen, setThemeModeModalOpen] = useState(false);
  const [themeColorModalOpen, setThemeColorModalOpen] = useState(false);
  const [fontSizeModalOpen, setFontSizeModalOpen] = useState(false);
  const [bgModalOpen, setBgModalOpen] = useState(false);
  const [autoRulesModalOpen, setAutoRulesModalOpen] = useState(false);
  const [bulkActionModalOpen, setBulkActionModalOpen] = useState(false);
  const [rolesModalOpen, setRolesModalOpen] = useState(false);

  // --- Sessions ---
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

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

  const handleUpdate = (patch) => {
    onChange?.({ ...appearance, ...patch });
  };

  return (
    <div className="page-container" style={{ padding: isMobile ? "16px" : "24px", maxWidth: 1000, margin: "0 auto" }}>
      <Title level={2} className="page-modern-title" style={{ marginBottom: 24, fontSize: isMobile ? '1.5rem' : '1.8rem' }}>
        {t("admin.settings") || "Admin Settings"}
      </Title>
      
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
                  <Card hoverable onClick={() => setLanguageModalOpen(true)} style={{ cursor: 'pointer', borderColor: token.colorBorder }}>
                    <Space align="start">
                        <GlobalOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                        <div>
                            <AntText strong style={{ display: 'block' }}>{t("settings.language")}</AntText>
                            <AntText type="secondary" style={{ fontSize: 12 }}>{t("settings.languageDesc")}</AntText>
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: token.colorBgLayout, borderRadius: token.borderRadius, border: '1px solid ' + token.colorBorder }}>
                        <Space>
                            <BgColorsOutlined style={{ fontSize: 20, color: '#faad14' }} />
                            <AntText strong>{t("settings.highContrast")}</AntText>
                        </Space>
                        <Switch checked={!!appearance?.highContrast} onChange={(v) => handleUpdate({ highContrast: v })} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                       <Card hoverable onClick={() => setThemeModeModalOpen(true)} style={{ cursor: 'pointer', borderColor: token.colorBorder }}>
                          <Space align="start">
                              <BgColorsOutlined style={{ fontSize: 24, color: '#13c2c2' }} />
                              <div>
                                  <AntText strong style={{ display: 'block' }}>{t("settings.themeMode")}</AntText>
                                  <AntText type="secondary" style={{ fontSize: 12 }}>{t("settings.themeModeDesc")}</AntText>
                              </div>
                          </Space>
                       </Card>
                       <Card hoverable onClick={() => setThemeColorModalOpen(true)} style={{ cursor: 'pointer', borderColor: token.colorBorder }}>
                          <Space align="start">
                              <FormatPainterOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                              <div>
                                  <AntText strong style={{ display: 'block' }}>{t("settings.themeColor")}</AntText>
                                  <AntText type="secondary" style={{ fontSize: 12 }}>{t("settings.themeColorDesc")}</AntText>
                              </div>
                          </Space>
                       </Card>
                       <Card hoverable onClick={() => setFontSizeModalOpen(true)} style={{ cursor: 'pointer', borderColor: token.colorBorder }}>
                          <Space align="start">
                              <FontSizeOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                              <div>
                                  <AntText strong style={{ display: 'block' }}>{t("settings.fontSize")}</AntText>
                                  <AntText type="secondary" style={{ fontSize: 12 }}>{t("settings.fontSizeDesc")}</AntText>
                              </div>
                          </Space>
                       </Card>
                       <Card hoverable onClick={() => setBgModalOpen(true)} style={{ cursor: 'pointer', borderColor: token.colorBorder }}>
                          <Space align="start">
                              <PictureOutlined style={{ fontSize: 24, color: '#eb2f96' }} />
                              <div>
                                  <AntText strong style={{ display: 'block' }}>{t("settings.customBackground")}</AntText>
                                  <AntText type="secondary" style={{ fontSize: 12 }}>{t("settings.customBackgroundDesc")}</AntText>
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
                           <ColorPicker 
                             value={appearance?.customColor || '#1677FF'} 
                             onChange={(c) => handleUpdate({ customColor: typeof c === 'string' ? c : c.toHexString() })} 
                             showText 
                             disabledAlpha
                             presets={[
                               {
                                 label: 'Recommended',
                                 colors: [
                                   '#1677FF', '#722ED1', '#13c2c2', '#52c41a', '#eb2f96', '#f5222d', '#fa8c16', '#fadb14'
                                 ],
                               },
                             ]}
                           />
                        </div>
                     )}
                 </Modal>
                 <Modal title={t("settings.fontSize")} open={fontSizeModalOpen} onCancel={() => setFontSizeModalOpen(false)} footer={null}>
                     <div style={{ padding: '16px 8px' }}>
                       <AntText type="secondary" style={{ marginBottom: 24, display: 'block' }}>{t("settings.fontSizeDesc")}</AntText>
                       <Slider
                          min={12}
                          max={30}
                          value={typeof appearance?.fontSize === 'number' ? appearance.fontSize : (appearance?.fontSize === 'large' ? 16 : 14)}
                          onChange={(v) => handleUpdate({ fontSize: v })}
                          marks={{ 12: '12', 14: '14', 16: '16', 20: '20', 24: '24', 30: '30' }}
                       />
                     </div>
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
                         presets={[
                              {
                                label: 'Recommended',
                                colors: [
                                  '#ffffff', '#f0f2f5', '#fafafa', '#f5f5f5', '#e6f7ff', '#f9f0ff', '#f6ffed'
                                ],
                              },
                         ]}
                         style={{ width: '100%' }} 
                       />
                       <Button onClick={() => handleUpdate({ backgroundColor: "" })}>{t("common.reset")}</Button>
                    </Space>
                 </Modal>
              </Card>
            ),
          },
          {
            key: "security",
            label: t("settings.security"),
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.privacySecurity")}</Title>}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                   <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: token.colorBgLayout, borderRadius: token.borderRadius, border: '1px solid ' + token.colorBorder }}>
                       <Space>
                           <SafetyCertificateOutlined style={{ fontSize: 20, color: '#faad14' }} />
                           <AntText strong>{t("settings.twoFactor")}</AntText>
                       </Space>
                       <Switch checked={!!securityPrefs.twoFactorEnabled} onChange={(v) => saveSecurity({ twoFactorEnabled: v })} />
                   </div>
                   <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                      <Card hoverable onClick={() => setPasswordModalOpen(true)} style={{ cursor: 'pointer', borderColor: token.colorBorder }}>
                        <Space align="start">
                            <LockOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                            <div>
                                <AntText strong style={{ display: 'block' }}>{t("settings.updatePassword")}</AntText>
                                <AntText type="secondary" style={{ fontSize: 12 }}>{t("settings.updatePasswordDesc")}</AntText>
                            </div>
                        </Space>
                      </Card>
                      <Card hoverable onClick={() => { setDevicesModalOpen(true); fetchSessions(); }} style={{ cursor: 'pointer', borderColor: token.colorBorder }}>
                        <Space align="start">
                            <DesktopOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                            <div>
                                <AntText strong style={{ display: 'block' }}>{t("settings.deviceManagement")}</AntText>
                                <AntText type="secondary" style={{ fontSize: 12 }}>{t("settings.deviceManagementDesc")}</AntText>
                            </div>
                        </Space>
                      </Card>
                       <Card hoverable onClick={() => { 
                           Modal.confirm({
                               title: t("settings.clearCache"),
                               content: t("settings.clearCacheDesc"),
                               onOk: () => {
                                   try { localStorage.clear(); } catch {} 
                                   message.success(t("settings.cacheCleared"));
                               }
                           });
                       }} style={{ cursor: 'pointer', borderColor: token.colorBorder }}>
                         <Space align="start">
                             <DeleteOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                             <div>
                                 <AntText strong type="danger" style={{ display: 'block' }}>{t("settings.clearCache")}</AntText>
                                 <AntText type="secondary" style={{ fontSize: 12 }}>{t("settings.clearCacheDesc")}</AntText>
                             </div>
                         </Space>
                       </Card>
                    </div>
                  </Space>
                  <Modal
                    title={t("settings.updatePassword")}
                    open={passwordModalOpen}
                    onCancel={() => !passwordLoading && setPasswordModalOpen(false)}
                    footer={null}
                    destroyOnClose
                    maskClosable={!passwordLoading}
                    closable={!passwordLoading}
                  >
                     <Form layout="vertical" 
                       onFinish={async (values) => {
                         console.log('Password change form submitted', values);
                         const { currentPassword, newPassword, confirmPassword } = values;
                         if (!newPassword || newPassword.length < 8) {
                           Modal.error({
                             title: t("settings.updatePassword"),
                             content: t("settings.passwordLength"),
                           });
                           return;
                         }
                         if (newPassword !== confirmPassword) {
                           Modal.error({
                             title: t("settings.updatePassword"),
                             content: t("settings.passwordMismatch"),
                           });
                           return;
                         }
                         
                         try {
                           console.log('Starting password change request...');
                          setPasswordLoading(true);
                          if (!authToken) { throw new Error(t("settings.notLoggedIn")); }
                          const result = await changePassword(authToken, currentPassword, newPassword);
                          console.log('Password change success', result);
                          message.success(t("settings.passwordUpdated"));
                           setPasswordModalOpen(false);
                         } catch (e) {
                           console.error("Change password failed:", e);
                           if (e?.response?.status === 401 || e?.response?.status === 400) {
                             Modal.error({
                               title: t("settings.updatePassword"),
                               content: t("settings.wrongCurrentPassword"),
                             });
                           } else {
                             Modal.error({
                               title: t("settings.updatePassword"),
                               content: e?.response?.data?.message || e?.message || t("settings.changePasswordFailed"),
                             });
                           }
                         } finally {
                           setPasswordLoading(false);
                         }
                       }}
                       onFinishFailed={(errorInfo) => {
                         console.log('Password form validation failed:', errorInfo);
                       }}
                     >
                       <Form.Item name="currentPassword" label={t("settings.currentPassword")} rules={[{ required: true }] }>
                         <Input.Password autoComplete="current-password" disabled={passwordLoading} />
                       </Form.Item>
                       <Form.Item name="newPassword" label={t("settings.newPassword")} rules={[{ required: true }] }>
                         <Input.Password autoComplete="new-password" disabled={passwordLoading} />
                       </Form.Item>
                       <Form.Item name="confirmPassword" label={t("settings.confirmPassword")} rules={[{ required: true }] }>
                         <Input.Password autoComplete="new-password" disabled={passwordLoading} />
                       </Form.Item>
                       <div style={{ textAlign: 'right' }}>
                          <Button onClick={() => {
                              console.log('Cancel password change clicked');
                              setPasswordModalOpen(false);
                          }} style={{ marginRight: 8 }} disabled={passwordLoading}>{t("common.cancel")}</Button>
                          <Button type="primary" htmlType="submit" loading={passwordLoading} onClick={() => console.log('Update password button clicked')}>{t("settings.updatePassword")}</Button>
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
                        <AntText type="secondary">{t("settings.deviceManagementDesc")}</AntText>
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
            key: "approval",
            label: t("settings.adminApproval"),
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.adminApprovalSettings")}</Title>}>
                 <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: appearance?.mode === 'dark' ? '#1f1f1f' : '#f9f9f9', borderRadius: 8, border: '1px solid ' + (appearance?.mode === 'dark' ? '#303030' : '#f0f0f0') }}>
                        <Space>
                            <BellOutlined style={{ fontSize: 20, color: '#52c41a' }} />
                            <AntText strong>{t("settings.approvalSound")}</AntText>
                        </Space>
                        <Switch checked={!!adminApprovalPrefs.soundEnabled} onChange={(v) => saveAdminApproval({ soundEnabled: v })} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                       <Card hoverable onClick={() => setAutoRulesModalOpen(true)} style={{ cursor: 'pointer', borderColor: token.colorBorder }}>
                          <Space align="start">
                              <RobotOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                              <div>
                                  <AntText strong style={{ display: 'block' }}>{t("settings.autoRules")}</AntText>
                                  <AntText type="secondary" style={{ fontSize: 12 }}>{t("settings.autoRulesDesc")}</AntText>
                              </div>
                          </Space>
                       </Card>
                       <Card hoverable onClick={() => setBulkActionModalOpen(true)} style={{ cursor: 'pointer', borderColor: token.colorBorder }}>
                          <Space align="start">
                              <BuildOutlined style={{ fontSize: 24, color: '#722ed1' }} />
                              <div>
                                  <AntText strong style={{ display: 'block' }}>{t("settings.defaultBulkAction")}</AntText>
                                  <AntText type="secondary" style={{ fontSize: 12 }}>{t("settings.bulkActionDesc")}</AntText>
                              </div>
                          </Space>
                       </Card>
                    </div>
                 </Space>
                 <Modal title={t("settings.autoRules")} open={autoRulesModalOpen} onCancel={() => setAutoRulesModalOpen(false)} footer={null}>
                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                      <div>
                        <AntText style={{ fontWeight: 600 }}>{t("settings.autoApproveStock")}</AntText>
                        <div style={{ marginTop: 8 }}>
                          <InputNumber min={0} max={99} value={adminApprovalPrefs.autoApproveWhenStockGt} onChange={(v) => saveAdminApproval({ autoApproveWhenStockGt: Number(v || 0) })} style={{ width: '100%' }} />
                        </div>
                        <AntText type="secondary">{t("settings.appliesToRenew")}</AntText>
                      </div>
                      <div>
                        <AntText style={{ fontWeight: 600 }}>{t("settings.autoRejectOverdue")}</AntText>
                        <div style={{ marginTop: 8 }}>
                          <InputNumber min={0} max={99} value={adminApprovalPrefs.autoRejectWhenOverdueGt} onChange={(v) => saveAdminApproval({ autoRejectWhenOverdueGt: Number(v || 0) })} style={{ width: '100%' }} />
                        </div>
                      </div>
                    </Space>
                 </Modal>
                 <Modal title={t("settings.defaultBulkAction")} open={bulkActionModalOpen} onCancel={() => setBulkActionModalOpen(false)} footer={null}>
                    <Radio.Group value={adminApprovalPrefs.defaultBulkAction} onChange={(e) => saveAdminApproval({ defaultBulkAction: e.target.value })} style={{ width: '100%' }}>
                       <Space direction="vertical" style={{ width: '100%' }}>
                          <Radio value="approve" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("common.approved")}</Radio>
                          <Radio value="reject" style={{ padding: 12, border: '1px solid #f0f0f0', borderRadius: 8, width: '100%' }}>{t("common.rejected")}</Radio>
                       </Space>
                     </Radio.Group>
                 </Modal>
              </Card>
            ),
          },
          {
            key: "roles",
            label: t("settings.roles") || "Roles",
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.adminRolesTitle")}</Title>}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                   <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                       <Card hoverable onClick={() => setRolesModalOpen(true)} style={{ cursor: 'pointer', borderColor: token.colorBorder }}>
                          <Space align="start">
                              <TeamOutlined style={{ fontSize: 24, color: '#13c2c2' }} />
                              <div>
                                  <AntText strong style={{ display: 'block' }}>{t("settings.manageRoles")}</AntText>
                                  <AntText type="secondary" style={{ fontSize: 12 }}>{t("settings.manageRolesDesc")}</AntText>
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
                        <Button type="primary" htmlType="submit">{t("common.save")}</Button>
                      </Form.Item>
                    </Form>
                    <Table dataSource={Object.entries(adminPermissions).map(([id, v]) => ({ key: id, id, modules: (v?.modules || []) }))} size="small" pagination={false} columns={[
                      { title: t("settings.adminId"), dataIndex: 'id', key: 'id' },
                      { title: t("settings.modules"), dataIndex: 'modules', key: 'modules', render: (m) => (m && m.length ? m.join(', ') : '—') },
                      { title: t("common.action"), key: 'action', render: (_, r) => (
                        <Space>
                          <Button onClick={() => setPermEditing({ id: r.id, modules: r.modules })}>{t("common.edit")}</Button>
                          <Button danger onClick={() => { const next = { ...adminPermissions }; delete next[r.id]; saveAdminPermissions(next); }}>{t("assistant.remove")}</Button>
                        </Space>
                      ) }
                    ]} />
                  </Space>
                </Modal>
              </Card>
            ),
          }
        ]}
      />
    </div>
  );
}

export default AdminSettingsPage;