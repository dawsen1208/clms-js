import React, { useMemo, useEffect, useState } from "react";
import { Card, Typography, Radio, Space, Divider, Input, Switch, Form, Button, Table, Tag, message, Select, InputNumber, Checkbox, Tabs } from "antd";
import { updateProfile, changePassword, getSessions, revokeSession, revokeAllSessions, getBooks } from "../api";

const { Title, Text } = Typography;

function SettingsPage({ appearance, onChange, user }) {
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
    { label: "Dashboard", value: "home" },
    { label: "Books", value: "book" },
    { label: "Borrow", value: "borrow" },
    { label: "History", value: "history" },
    { label: "Users", value: "users" },
    { label: "Profile", value: "profile" },
    { label: "Settings", value: "settings" },
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
        device: s.device || s.userAgent || "Unknown",
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
    <div style={{ padding: "1.5rem" }}>
      <Tabs
        items={[
          {
            key: "appearance",
            label: "Appearance",
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={4} style={{ margin: 0 }}>Appearance Settings</Title>}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div>
                    <Text style={{ fontWeight: 600 }}>Theme Mode</Text>
                    <div style={{ marginTop: 8 }}>
                      <Radio.Group value={appearance?.mode || 'light'} onChange={(e) => handleUpdate({ mode: e.target.value })}>
                        <Space direction="horizontal">
                          <Radio value="light">Light</Radio>
                          <Radio value="dark">Dark</Radio>
                        </Space>
                      </Radio.Group>
                    </div>
                  </div>
                  <div>
                    <Text style={{ fontWeight: 600 }}>Theme Color</Text>
                    <div style={{ marginTop: 8 }}>
                      <Radio.Group value={appearance?.themeColor || 'blue'} onChange={(e) => handleUpdate({ themeColor: e.target.value })}>
                        <Space direction="horizontal">
                          <Radio value="blue">Blue</Radio>
                          <Radio value="purple">Purple</Radio>
                          <Radio value="green">Green</Radio>
                          <Radio value="custom">Custom</Radio>
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
                    <Text style={{ fontWeight: 600 }}>Font Size</Text>
                    <div style={{ marginTop: 8 }}>
                      <Radio.Group value={appearance?.fontSize || 'normal'} onChange={(e) => handleUpdate({ fontSize: e.target.value })}>
                        <Space direction="horizontal">
                          <Radio value="normal">Normal</Radio>
                          <Radio value="large">Large</Radio>
                        </Space>
                      </Radio.Group>
                    </div>
                  </div>
                  <div>
                    <Space align="center">
                      <Text style={{ fontWeight: 600 }}>High Contrast Mode</Text>
                      <Switch checked={!!appearance?.highContrast} onChange={(v) => handleUpdate({ highContrast: v })} />
                    </Space>
                  </div>
                </Space>
              </Card>
            ),
          },
          {
            key: "notifications",
            label: "Notifications",
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>Notification Settings</Title>}>
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Space align="center">
                    <Text style={{ width: 160 }}>In-app notifications</Text>
                    <Switch checked={!!notifPrefs.inApp} onChange={(v) => saveNotifications({ inApp: v })} />
                  </Space>
                  <Space align="center">
                    <Text style={{ width: 160 }}>Email notifications</Text>
                    <Switch checked={!!notifPrefs.email} onChange={(v) => saveNotifications({ email: v })} disabled={!user?.email} />
                  </Space>
                  <div>
                    <Text style={{ fontWeight: 600 }}>Reminder days</Text>
                    <div style={{ marginTop: 8 }}>
                      <Radio.Group value={notifPrefs.reminderDays || 3} onChange={(e) => saveNotifications({ reminderDays: Number(e.target.value) })}>
                        <Space>
                          <Radio value={1}>1 day</Radio>
                          <Radio value={3}>3 days</Radio>
                          <Radio value={5}>5 days</Radio>
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
            label: "Privacy & Security",
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>Privacy & Security</Title>}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div>
                    <Tag color={securityPrefs.twoFactorEnabled ? 'green' : 'default'}>
                      {securityPrefs.twoFactorEnabled ? 'Two-factor enabled' : 'Two-factor disabled'}
                    </Tag>
                    <Switch checked={!!securityPrefs.twoFactorEnabled} onChange={(v) => saveSecurity({ twoFactorEnabled: v })} style={{ marginLeft: 12 }} />
                  </div>
                  <Form layout="vertical" onFinish={async (values) => {
                    const { currentPassword, newPassword, confirmPassword } = values;
                    if (!newPassword || newPassword.length < 8) { message.error('New password must be at least 8 characters'); return; }
                    if (newPassword !== confirmPassword) { message.error('New passwords do not match'); return; }
                    try { if (!token) { message.error('Not logged in'); return; } await changePassword(token, currentPassword, newPassword); message.success('Password updated'); } catch (e) { message.error(e?.response?.data?.message || e?.message || 'Failed to change password'); }
                  }}>
                    <Form.Item name="currentPassword" label="Current Password" rules={[{ required: true }] }>
                      <Input.Password autoComplete="current-password" />
                    </Form.Item>
                    <Form.Item name="newPassword" label="New Password" rules={[{ required: true }] }>
                      <Input.Password autoComplete="new-password" />
                    </Form.Item>
                    <Form.Item name="confirmPassword" label="Confirm New Password" rules={[{ required: true }] }>
                      <Input.Password autoComplete="new-password" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit">Update Password</Button>
                  </Form>
                  <div>
                    <Space style={{ marginBottom: 8 }}>
                      <Button onClick={fetchSessions}>Refresh devices</Button>
                      <Button danger onClick={async () => { try { if (!token) { message.error('Not logged in'); return; } await revokeAllSessions(token); message.success('Signed out all devices'); fetchSessions(); } catch (e) { message.error(e?.response?.data?.message || e?.message || 'Failed to sign out all devices'); } }}>Sign out all devices</Button>
                    </Space>
                    <Table loading={sessionsLoading} dataSource={sessions} size="small" pagination={false} columns={[
                      { title: 'Device', dataIndex: 'device', key: 'device' },
                      { title: 'IP', dataIndex: 'ip', key: 'ip' },
                      { title: 'Login Time', dataIndex: 'loginTime', key: 'loginTime', render: (v) => new Date(v).toLocaleString() },
                      { title: 'Action', key: 'action', render: (_, r) => (
                        <Button danger size="small" onClick={async () => { try { if (!token) { message.error('Not logged in'); return; } if (!r.id) { message.error('Session id missing'); return; } await revokeSession(token, r.id); message.success('Signed out device'); fetchSessions(); } catch (e) { message.error(e?.response?.data?.message || e?.message || 'Failed to sign out device'); } }}>Sign out</Button>
                      ) }
                    ]} />
                  </div>
                  <div>
                    <Button danger onClick={() => { try { localStorage.clear(); } catch {} message.success('Local cache cleared'); }}>Clear local cache</Button>
                  </div>
                </Space>
              </Card>
            ),
          },
          {
            key: "operation",
            label: "Operation",
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>Operation Preferences</Title>}>
                <Space direction="vertical" size={16}>
                  <div>
                    <Text style={{ fontWeight: 600 }}>Default Search</Text>
                    <div style={{ marginTop: 8 }}>
                      <Radio.Group value={operationPrefs.searchBy} onChange={(e) => saveOperation({ searchBy: e.target.value })}>
                        <Space>
                          <Radio value="title">Title</Radio>
                          <Radio value="author">Author</Radio>
                          <Radio value="category">Category</Radio>
                        </Space>
                      </Radio.Group>
                    </div>
                  </div>
                  <div>
                    <Text style={{ fontWeight: 600 }}>Default Sort</Text>
                    <div style={{ marginTop: 8 }}>
                      <Radio.Group value={operationPrefs.sortBy} onChange={(e) => saveOperation({ sortBy: e.target.value })}>
                        <Space>
                          <Radio value="latest">Latest</Radio>
                          <Radio value="most_borrowed">Most Borrowed</Radio>
                          <Radio value="stock_high">Stock High</Radio>
                        </Space>
                      </Radio.Group>
                    </div>
                  </div>
                  <div>
                    <Text style={{ fontWeight: 600 }}>Default View</Text>
                    <div style={{ marginTop: 8 }}>
                      <Radio.Group value={operationPrefs.view} onChange={(e) => saveOperation({ view: e.target.value })}>
                        <Space>
                          <Radio value="grid">Card View</Radio>
                          <Radio value="list">List View</Radio>
                        </Space>
                      </Radio.Group>
                    </div>
                  </div>
                  <Space align="center">
                    <Text style={{ fontWeight: 600 }}>Show Advanced Filters</Text>
                    <Switch checked={!!operationPrefs.showAdvanced} onChange={(v) => saveOperation({ showAdvanced: v })} />
                  </Space>
                </Space>
              </Card>
            ),
          },
          {
            key: "recommend",
            label: "Recommendation",
            children: (
              <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>Personalized Recommendation Settings</Title>}>
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <div>
                    <Text style={{ fontWeight: 600 }}>Preferred Categories</Text>
                    <div style={{ marginTop: 8 }}>
                      <Select mode="multiple" allowClear placeholder="Select preferred categories" value={recommendPrefs.preferredCategories} onChange={(vals) => saveRecommend({ preferredCategories: vals })} options={allCategories.map(c => ({ label: c, value: c }))} style={{ width: '100%' }} />
                    </div>
                  </div>
                  <div>
                    <Text style={{ fontWeight: 600 }}>Excluded Categories</Text>
                    <div style={{ marginTop: 8 }}>
                      <Select mode="multiple" allowClear placeholder="Select categories to exclude" value={recommendPrefs.excludedCategories} onChange={(vals) => saveRecommend({ excludedCategories: vals })} options={allCategories.map(c => ({ label: c, value: c }))} style={{ width: '100%' }} />
                    </div>
                  </div>
                  <Space align="center">
                    <Text style={{ fontWeight: 600 }}>Auto-learn from history</Text>
                    <Switch checked={!!recommendPrefs.autoLearn} onChange={(v) => saveRecommend({ autoLearn: v })} />
                  </Space>
                  <div>
                    <Button danger onClick={() => { try { localStorage.removeItem('recommend_behavior'); localStorage.removeItem('compare_ids'); message.success('Recommendation model data reset'); } catch {} }}>Reset recommendation data</Button>
                  </div>
                </Space>
              </Card>
            ),
          },
          ...(user?.role === 'Administrator' ? [
            {
              key: "approval",
              label: "Admin Approval",
              children: (
                <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>Admin Approval Settings</Title>}>
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <div>
                      <Text style={{ fontWeight: 600 }}>Auto-approve when stock &gt;</Text>
                      <div style={{ marginTop: 8 }}>
                        <InputNumber min={0} max={99} value={adminApprovalPrefs.autoApproveWhenStockGt} onChange={(v) => saveAdminApproval({ autoApproveWhenStockGt: Number(v || 0) })} />
                      </div>
                      <Text type="secondary">Applies to renew requests only</Text>
                    </div>
                    <div>
                      <Text style={{ fontWeight: 600 }}>Auto-reject when overdue times &gt;</Text>
                      <div style={{ marginTop: 8 }}>
                        <InputNumber min={0} max={99} value={adminApprovalPrefs.autoRejectWhenOverdueGt} onChange={(v) => saveAdminApproval({ autoRejectWhenOverdueGt: Number(v || 0) })} />
                      </div>
                    </div>
                    <div>
                      <Text style={{ fontWeight: 600 }}>Default bulk action</Text>
                      <div style={{ marginTop: 8 }}>
                        <Radio.Group value={adminApprovalPrefs.defaultBulkAction} onChange={(e) => saveAdminApproval({ defaultBulkAction: e.target.value })}>
                          <Space>
                            <Radio value="approve">Approve</Radio>
                            <Radio value="reject">Reject</Radio>
                          </Space>
                        </Radio.Group>
                      </div>
                    </div>
                    <Space align="center">
                      <Text style={{ fontWeight: 600 }}>Approval sound</Text>
                      <Switch checked={!!adminApprovalPrefs.soundEnabled} onChange={(v) => saveAdminApproval({ soundEnabled: v })} />
                    </Space>
                  </Space>
                </Card>
              ),
            },
            {
              key: "roles",
              label: "Roles & Permissions",
              children: (
                <Card style={{ borderRadius: 12 }} title={<Title level={5} style={{ margin: 0 }}>Admin Roles & Permissions</Title>}>
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <Form layout="inline" onFinish={() => {
                      const id = (permEditing.id || '').trim();
                      if (!id) { message.error('Admin identifier required'); return; }
                      const next = { ...adminPermissions, [id]: { modules: permEditing.modules || [] } };
                      saveAdminPermissions(next);
                      setPermEditing({ id: '', modules: [] });
                      message.success('Permissions saved');
                    }}>
                      <Form.Item label="Admin ID">
                        <Input placeholder="userId or email" value={permEditing.id} onChange={(e) => setPermEditing({ ...permEditing, id: e.target.value })} style={{ width: 240 }} />
                      </Form.Item>
                      <Form.Item label="Modules">
                        <Checkbox.Group options={moduleOptions} value={permEditing.modules} onChange={(vals) => setPermEditing({ ...permEditing, modules: vals })} />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit">Save</Button>
                      </Form.Item>
                    </Form>
                    <Table dataSource={Object.entries(adminPermissions).map(([id, v]) => ({ key: id, id, modules: (v?.modules || []) }))} size="small" pagination={false} columns={[
                      { title: 'Admin', dataIndex: 'id', key: 'id' },
                      { title: 'Modules', dataIndex: 'modules', key: 'modules', render: (m) => (m && m.length ? m.join(', ') : '—') },
                      { title: 'Action', key: 'action', render: (_, r) => (
                        <Space>
                          <Button onClick={() => setPermEditing({ id: r.id, modules: r.modules })}>Edit</Button>
                          <Button danger onClick={() => { const next = { ...adminPermissions }; delete next[r.id]; saveAdminPermissions(next); }}>Delete</Button>
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
