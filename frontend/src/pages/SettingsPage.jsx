import React, { useMemo, useEffect, useState } from "react";
import { Card, Typography, Radio, Space, Divider, Input, Switch, Form, Button, Table, Tag, message, Select, InputNumber, Checkbox, Tabs } from "antd";
import { updateProfile, changePassword, getSessions, revokeSession, revokeAllSessions, getBooks } from "../api";
import { useLanguage } from "../contexts/LanguageContext"; // ✅ Import Hook

const { Title, Text } = Typography;

function SettingsPage({ appearance, onChange, user }) {
  const { language, setLanguage, t } = useLanguage(); // ✅ Use Language Hook
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
    <div className="settings-page" style={{ padding: "24px", maxWidth: 1000, margin: "0 auto" }}>
      <Title level={2} className="page-modern-title" style={{ marginBottom: 24 }}>{t("settings.settings")}</Title>
      <Tabs
        defaultActiveKey="language"
        tabPosition="left"
        items={[
          {
            key: "language",
            label: t("settings.language"),
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={4} style={{ margin: 0 }}>{t("settings.language")}</Title>}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div>
                    <Text style={{ fontWeight: 600 }}>{t("settings.switchLanguage")}</Text>
                    <div style={{ marginTop: 8 }}>
                      <Radio.Group value={language} onChange={(e) => setLanguage(e.target.value)}>
                        <Space direction="horizontal">
                          <Radio value="en">{t("settings.english")}</Radio>
                          <Radio value="zh">{t("settings.chinese")}</Radio>
                        </Space>
                      </Radio.Group>
                    </div>
                  </div>
                </Space>
              </Card>
            ),
          },
          {
            key: "appearance",
            label: t("settings.appearance"),
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={4} style={{ margin: 0 }}>{t("settings.appearance")}</Title>}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div>
                    <Text style={{ fontWeight: 600 }}>{t("settings.themeMode")}</Text>
                    <div style={{ marginTop: 8 }}>
                      <Radio.Group value={appearance?.mode || 'light'} onChange={(e) => handleUpdate({ mode: e.target.value })}>
                        <Space direction="horizontal">
                          <Radio value="light">{t("settings.light")}</Radio>
                          <Radio value="dark">{t("settings.dark")}</Radio>
                        </Space>
                      </Radio.Group>
                    </div>
                  </div>
                  <div>
                    <Text style={{ fontWeight: 600 }}>{t("settings.themeColor")}</Text>
                    <div style={{ marginTop: 8 }}>
                      <Radio.Group value={appearance?.themeColor || 'blue'} onChange={(e) => handleUpdate({ themeColor: e.target.value })}>
                        <Space direction="horizontal">
                          <Radio value="blue">{t("settings.blue")}</Radio>
                          <Radio value="purple">{t("settings.purple")}</Radio>
                          <Radio value="green">{t("settings.green")}</Radio>
                          <Radio value="custom">{t("settings.custom")}</Radio>
                        </Space>
                      </Radio.Group>
                    </div>
                    {appearance?.themeColor === 'custom' && (
                      <div style={{ marginTop: 10 }}>
                        <Input type="color" value={appearance?.customColor || '#1677FF'} onChange={(e) => handleUpdate({ customColor: e.target.value })} style={{ width: 80, padding: 0, border: 'none', background: 'transparent' }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <Text style={{ fontWeight: 600 }}>{t("settings.fontSize")}</Text>
                    <div style={{ marginTop: 8 }}>
                      <Radio.Group value={appearance?.fontSize || 'normal'} onChange={(e) => handleUpdate({ fontSize: e.target.value })}>
                        <Space direction="horizontal">
                          <Radio value="normal">{t("settings.normal")}</Radio>
                          <Radio value="large">{t("settings.large")}</Radio>
                        </Space>
                      </Radio.Group>
                    </div>
                  </div>
                  <div>
                    <Space align="center">
                      <Text style={{ fontWeight: 600 }}>{t("settings.highContrast")}</Text>
                      <Switch checked={!!appearance?.highContrast} onChange={(v) => handleUpdate({ highContrast: v })} />
                    </Space>
                  </div>
                </Space>
              </Card>
            ),
          },
          {
            key: "notifications",
            label: t("settings.notifications"),
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.notifications")}</Title>}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Space align="center">
                    <Text style={{ width: 160 }}>{t("settings.inAppNotif")}</Text>
                    <Switch checked={!!notifPrefs.inApp} onChange={(v) => saveNotifications({ inApp: v })} />
                  </Space>
                  <Space align="center">
                    <Text style={{ width: 160 }}>{t("settings.emailNotif")}</Text>
                    <Switch checked={!!notifPrefs.email} onChange={(v) => saveNotifications({ email: v })} disabled={!user?.email} />
                  </Space>
                  <div>
                    <Text style={{ fontWeight: 600 }}>{t("settings.reminderDays")}</Text>
                    <div style={{ marginTop: 8 }}>
                      <Radio.Group value={notifPrefs.reminderDays || 3} onChange={(e) => saveNotifications({ reminderDays: Number(e.target.value) })}>
                        <Space>
                          <Radio value={1}>1 {t("common.day")}</Radio>
                          <Radio value={3}>3 {t("common.days")}</Radio>
                          <Radio value={5}>5 {t("common.days")}</Radio>
                        </Space>
                      </Radio.Group>
                    </div>
                  </div>
                </Space>
              </Card>
            ),
          },
          {
            key: "privacy",
            label: t("settings.privacySecurity"),
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.privacySecurity")}</Title>}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div>
                    <Tag color={securityPrefs.twoFactorEnabled ? 'green' : 'default'}>
                      {securityPrefs.twoFactorEnabled ? t("settings.twoFactor") : t("settings.twoFactorDisabled")}
                    </Tag>
                    <Switch checked={!!securityPrefs.twoFactorEnabled} onChange={(v) => saveSecurity({ twoFactorEnabled: v })} style={{ marginLeft: 12 }} />
                  </div>
                  <Form layout="vertical" onFinish={async (values) => {
                    const { currentPassword, newPassword, confirmPassword } = values;
                    if (!newPassword || newPassword.length < 8) { message.error(t("settings.passwordLength")); return; }
                    if (newPassword !== confirmPassword) { message.error(t("settings.passwordMismatch")); return; }
                    try { if (!token) { message.error(t("settings.notLoggedIn")); return; } await changePassword(token, currentPassword, newPassword); message.success(t("settings.passwordUpdated")); } catch (e) { message.error(e?.response?.data?.message || e?.message || t("settings.changePasswordFailed")); }
                  }}>
                    <Form.Item name="currentPassword" label={t("settings.currentPassword")} rules={[{ required: true }] }>
                      <Input.Password autoComplete="current-password" />
                    </Form.Item>
                    <Form.Item name="newPassword" label={t("settings.newPassword")} rules={[{ required: true }] }>
                      <Input.Password autoComplete="new-password" />
                    </Form.Item>
                    <Form.Item name="confirmPassword" label={t("settings.confirmPassword")} rules={[{ required: true }] }>
                      <Input.Password autoComplete="new-password" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit">{t("settings.updatePassword")}</Button>
                  </Form>
                  <div>
                    <Space style={{ marginBottom: 8 }}>
                      <Button onClick={fetchSessions}>{t("settings.refreshDevices")}</Button>
                      <Button danger onClick={async () => { try { if (!token) { message.error(t("settings.notLoggedIn")); return; } await revokeAllSessions(token); message.success(t("settings.signedOutAll")); fetchSessions(); } catch (e) { message.error(e?.response?.data?.message || e?.message || t("settings.signOutAllFailed")); } }}>{t("settings.signOutAll")}</Button>
                    </Space>
                    <Table loading={sessionsLoading} dataSource={sessions} size="small" pagination={false} columns={[
                      { title: t("settings.device"), dataIndex: 'device', key: 'device' },
                      { title: t("settings.ip"), dataIndex: 'ip', key: 'ip' },
                      { title: t("settings.loginTime"), dataIndex: 'loginTime', key: 'loginTime', render: (v) => new Date(v).toLocaleString() },
                      { title: t("settings.action"), key: 'action', render: (_, r) => (
                        <Button danger size="small" onClick={async () => { try { if (!token) { message.error(t("settings.notLoggedIn")); return; } if (!r.id) { message.error(t("settings.sessionIdMissing")); return; } await revokeSession(token, r.id); message.success(t("settings.signedOutDevice")); fetchSessions(); } catch (e) { message.error(e?.response?.data?.message || e?.message || t("settings.signOutDeviceFailed")); } }}>{t("assistant.remove")}</Button>
                      ) }
                    ]} />
                  </div>
                  <div>
                    <Button danger onClick={() => { try { localStorage.clear(); } catch {} message.success(t("settings.cacheCleared")); }}>{t("settings.clearCache")}</Button>
                  </div>
                </Space>
              </Card>
            ),
          },
          {
            key: "operation",
            label: t("settings.operation"),
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.operationPrefs")}</Title>}>
                <Space direction="vertical" size={16}>
                  <div>
                    <Text style={{ fontWeight: 600 }}>{t("settings.defaultSearch")}</Text>
                    <div style={{ marginTop: 8 }}>
                      <Radio.Group value={operationPrefs.searchBy} onChange={(e) => saveOperation({ searchBy: e.target.value })}>
                        <Space>
                          <Radio value="title">{t("settings.titleOpt")}</Radio>
                          <Radio value="author">{t("settings.authorOpt")}</Radio>
                          <Radio value="category">{t("settings.categoryOpt")}</Radio>
                        </Space>
                      </Radio.Group>
                    </div>
                  </div>
                  <div>
                    <Text style={{ fontWeight: 600 }}>{t("settings.defaultSort")}</Text>
                    <div style={{ marginTop: 8 }}>
                      <Radio.Group value={operationPrefs.sortBy} onChange={(e) => saveOperation({ sortBy: e.target.value })}>
                        <Space>
                          <Radio value="latest">{t("settings.latestOpt")}</Radio>
                          <Radio value="most_borrowed">{t("settings.mostBorrowedOpt")}</Radio>
                          <Radio value="stock_high">{t("settings.stockHighOpt")}</Radio>
                        </Space>
                      </Radio.Group>
                    </div>
                  </div>
                  <div>
                    <Text style={{ fontWeight: 600 }}>{t("settings.defaultView")}</Text>
                    <div style={{ marginTop: 8 }}>
                      <Radio.Group value={operationPrefs.view} onChange={(e) => saveOperation({ view: e.target.value })}>
                        <Space>
                          <Radio value="grid">{t("settings.cardViewOpt")}</Radio>
                          <Radio value="list">{t("settings.listViewOpt")}</Radio>
                        </Space>
                      </Radio.Group>
                    </div>
                  </div>
                  <Space align="center">
                    <Text style={{ fontWeight: 600 }}>{t("settings.showAdvanced")}</Text>
                    <Switch checked={!!operationPrefs.showAdvanced} onChange={(v) => saveOperation({ showAdvanced: v })} />
                  </Space>
                </Space>
              </Card>
            ),
          },
          {
            key: "recommend",
            label: t("settings.recommendation"),
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.recommendationSettings")}</Title>}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div>
                    <Text style={{ fontWeight: 600 }}>{t("settings.preferredCategories")}</Text>
                    <div style={{ marginTop: 8 }}>
                      <Select mode="multiple" allowClear placeholder={t("settings.selectPreferred")} value={recommendPrefs.preferredCategories} onChange={(vals) => saveRecommend({ preferredCategories: vals })} options={allCategories.map(c => ({ label: c, value: c }))} style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div>
                    <Text style={{ fontWeight: 600 }}>{t("settings.excludedCategories")}</Text>
                    <div style={{ marginTop: 8 }}>
                      <Select mode="multiple" allowClear placeholder={t("settings.selectExcluded")} value={recommendPrefs.excludedCategories} onChange={(vals) => saveRecommend({ excludedCategories: vals })} options={allCategories.map(c => ({ label: c, value: c }))} style={{ width: '100%' }} />
                    </div>
                  </div>
                  <Space align="center">
                    <Text style={{ fontWeight: 600 }}>{t("settings.autoLearn")}</Text>
                    <Switch checked={!!recommendPrefs.autoLearn} onChange={(v) => saveRecommend({ autoLearn: v })} />
                  </Space>
                  <div>
                    <Button danger onClick={() => { try { localStorage.removeItem('recommend_behavior'); localStorage.removeItem('compare_ids'); message.success(t("settings.dataReset")); } catch {} }}>{t("settings.resetData")}</Button>
                  </div>
                </Space>
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
                    <div>
                      <Text style={{ fontWeight: 600 }}>{t("settings.autoApproveStock")}</Text>
                      <div style={{ marginTop: 8 }}>
                        <InputNumber min={0} max={99} value={adminApprovalPrefs.autoApproveWhenStockGt} onChange={(v) => saveAdminApproval({ autoApproveWhenStockGt: Number(v || 0) })} />
                      </div>
                      <Text type="secondary">{t("settings.appliesToRenew")}</Text>
                    </div>
                    <div>
                      <Text style={{ fontWeight: 600 }}>{t("settings.autoRejectOverdue")}</Text>
                      <div style={{ marginTop: 8 }}>
                        <InputNumber min={0} max={99} value={adminApprovalPrefs.autoRejectWhenOverdueGt} onChange={(v) => saveAdminApproval({ autoRejectWhenOverdueGt: Number(v || 0) })} />
                      </div>
                    </div>
                    <div>
                      <Text style={{ fontWeight: 600 }}>{t("settings.defaultBulkAction")}</Text>
                      <div style={{ marginTop: 8 }}>
                        <Radio.Group value={adminApprovalPrefs.defaultBulkAction} onChange={(e) => saveAdminApproval({ defaultBulkAction: e.target.value })}>
                          <Space>
                            <Radio value="approve">{t("settings.approveOpt")}</Radio>
                            <Radio value="reject">{t("settings.rejectOpt")}</Radio>
                          </Space>
                        </Radio.Group>
                      </div>
                    </div>
                    <Space align="center">
                      <Text style={{ fontWeight: 600 }}>{t("settings.approvalSound")}</Text>
                      <Switch checked={!!adminApprovalPrefs.soundEnabled} onChange={(v) => saveAdminApproval({ soundEnabled: v })} />
                    </Space>
                  </Space>
                </Card>
              ),
            },
            {
              key: "roles",
              label: t("settings.roles"),
              children: (
                <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>{t("settings.adminRolesTitle")}</Title>}>
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
                </Card>
              ),
            }
          ] : [])]}
      />
    </div>
  );
}

export default SettingsPage;
