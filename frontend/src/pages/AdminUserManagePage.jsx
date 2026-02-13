// ✅ client/src/pages/AdminUserManagePage.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  Card,
  Progress,
  Tag,
  Spin,
  message,
  Modal,
  Button,
  Typography,
  Row,
  Col,
  Input,
  Space,
  Grid,
  List,
  Tabs,
  Badge,
  Tooltip,
  theme
} from "antd";
import {
  ReloadOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  AlertOutlined,
  CheckCircleOutlined,
  TagsOutlined,
  PieChartOutlined
} from "@ant-design/icons";
import { getUserAnalytics, toggleBlacklist, approveUser } from "../api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useLanguage } from "../contexts/LanguageContext";
import PageShell from "../components/common/PageShell";
import KPIStatCard from "../components/common/KPIStatCard";

const { Paragraph } = Typography;
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8854d0"];
const { useBreakpoint } = Grid;
const { useToken } = theme;

const AdminUserManagePage = () => {
  const { t } = useLanguage();
  const { token } = useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [users, setUsers] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [distOpen, setDistOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("1");

  let authToken = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (authToken?.startsWith('"')) {
    try {
      authToken = JSON.parse(authToken);
    } catch {}
  }

  /* =========================================================
     📡 Load user data
     ========================================================= */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getUserAnalytics(authToken);
      const list = res.data || [];
      setUsers(list);
      setTableData(list);
    } catch (err) {
      console.error("❌ Failed to load users:", err);
      message.error(t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    setTableData(users);
  }, [users]);

  const pendingUsers = useMemo(() => users.filter(u => u.status === 'PENDING'), [users]);

  const handleApprove = async (userId, status) => {
    try {
        await approveUser(userId, status, authToken);
        message.success(status === 'APPROVED' ? (t("admin.userApproved") || "用户已通过审核") : (t("admin.userRejected") || "用户已拒绝"));
        fetchUsers();
    } catch (err) {
        message.error(t("admin.operationFailed") || "操作失败");
    }
  };

  // 🔤 Helpers: translate common Chinese labels to English for display
  const toEnglishCategory = (text) => (text === "未知" ? t("admin.unknown") : text);
  const toEnglishPersona = (p) => {
    if (!p) return t("admin.unknown");
    const s = String(p).trim();
    // Handle common variants by substring match
    if (/普通读者/.test(s)) return t("admin.regularReader");
    if (/高频借阅者/.test(s)) return t("admin.frequentBorrower");
    if (/新用户/.test(s)) return t("admin.newUser");
    if (/管理员/.test(s)) return t("admin.administrator");
    if (/未知/.test(s)) return t("admin.unknown");
    return s;
  };
  const toEnglishDescription = (d) => {
    if (!d) return t("admin.noDescription");
    let tStr = String(d);
    tStr = tStr.replace(/阅读类型多样，?兴趣广泛。?/g, t("admin.readsDiverse"));
    tStr = tStr.replace(/偏好商业类书籍。?/g, t("admin.prefersBusiness"));
    tStr = tStr.replace(/偏好烹饪类书籍。?/g, t("admin.prefersCooking"));
    tStr = tStr.replace(/偏好小说(与)?文学类书籍。?/g, t("admin.prefersFiction"));
    tStr = tStr.replace(/新用户，?阅读记录较少。?/g, t("admin.newUserDesc"));
    tStr = tStr.replace(/借阅频率较高，?习惯按时归还。?/g, t("admin.frequentBorrowerDesc"));
    tStr = tStr.replace(/有逾期记录，?需要提醒。?/g, t("admin.overdueDesc"));
    tStr = tStr.replace(/未知/g, t("admin.unknown"));
    return tStr;
  };

  /* =========================================================
     💡 Click persona tag => open description modal
     ========================================================= */
  const handlePersonaClick = (persona, description) => {
    setSelectedPersona({ persona, description });
    setModalVisible(true);
  };

  /* =========================================================
     🚫 Handle Blacklist Toggle
     ========================================================= */
  const handleBlacklistClick = (user) => {
    if (user.isBlacklisted) {
      Modal.confirm({
        title: t("admin.confirmUnban") || "确认解除黑名单",
        content: t("admin.unbanMessage") || `确定要将用户 ${user.name} 移出黑名单吗？`,
        onOk: async () => {
          try {
            await toggleBlacklist(user.userId, false, "", authToken);
            message.success(t("admin.successUnban") || "已解除黑名单");
            fetchUsers();
          } catch (e) {
            message.error(t("admin.operationFailed") || "操作失败");
          }
        }
      });
    } else {
      let reason = "";
      Modal.confirm({
        title: t("admin.confirmBan") || "确认拉黑用户",
        content: (
           <div>
             <p>{t("admin.banMessage") || `确定要将用户 ${user.name} 加入黑名单吗？`}</p>
             <Input 
               placeholder={t("admin.banReasonPlaceholder") || "请输入拉黑原因 (可选)"} 
               onChange={(e) => reason = e.target.value} 
               style={{ marginTop: 10 }}
             />
           </div>
        ),
        onOk: async () => {
           try {
             await toggleBlacklist(user.userId, true, reason, authToken);
             message.success(t("admin.successBan") || "已加入黑名单");
             fetchUsers();
           } catch (e) {
             message.error(t("admin.operationFailed") || "操作失败");
           }
        }
      });
    }
  };

  /* =========================================================
     📊 Generate pie chart data (by persona)
     ========================================================= */
  const chartData = Object.entries(
    users.reduce((acc, u) => {
      if (u.persona) acc[u.persona] = (acc[u.persona] || 0) + 1;
      return acc;
    }, {})
  ).map(([persona, count]) => ({ name: toEnglishPersona(persona), value: count }));

  /* =========================================================
     📋 Table columns
     ========================================================= */
  const columns = [
    { title: t("admin.username"), dataIndex: "name", key: "name", width: 140, fixed: 'left' },
    { title: t("admin.userId"), dataIndex: "userId", key: "userId", width: 120 },
    { title: t("admin.role"), dataIndex: "role", key: "role", width: 120 },
    {
      title: t("admin.topCategory"),
      dataIndex: "topCategory",
      key: "topCategory",
      render: (text) => <Tag>{toEnglishCategory(text) || "—"}</Tag>,
      width: 150,
    },
    { title: t("admin.totalBorrows"), dataIndex: "totalBorrows", key: "totalBorrows", width: 120 },
    {
      title: t("admin.notReturned"),
      dataIndex: "overdueCount",
      key: "overdueCount",
      render: (v) => <Tag color={v > 0 ? "error" : "success"}>{v}</Tag>,
      width: 100,
    },
    {
      title: t("admin.status") || "状态",
      key: "status",
      width: 100,
      render: (_, record) => (
        record.isBlacklisted 
          ? <Tooltip title={record.blacklistReason}><Tag color="red">{t("admin.blacklisted")}</Tag></Tooltip> 
          : <Tag color="green">{t("admin.normal")}</Tag>
      )
    },
    {
      title: t("admin.action") || "操作",
      key: "action",
      width: 120,
      render: (_, record) => {
        if (record.role === "Administrator") return null;
        return (
          <Button 
            danger={!record.isBlacklisted}
            type={record.isBlacklisted ? "default" : "primary"}
            size="small"
            onClick={() => handleBlacklistClick(record)}
          >
            {record.isBlacklisted ? (t("admin.unban") || "解封") : (t("admin.ban") || "拉黑")}
          </Button>
        );
      }
    },
    {
      title: t("admin.onTimeRate"),
      dataIndex: "onTimeRate",
      key: "onTimeRate",
      render: (v) => (
        <Progress
          percent={v}
          size="small"
          strokeColor={v >= 80 ? token.colorSuccess : token.colorError}
          status={v >= 80 ? "active" : "exception"}
        />
      ),
      width: 160,
    },
    {
      title: t("admin.persona"),
      dataIndex: "persona",
      key: "persona",
      render: (persona, record) => (
        <Tag
          color="blue"
          className="persona-tag"
          style={{ cursor: 'pointer' }}
          onClick={() =>
            handlePersonaClick(persona, record.personaDescription)
          }
        >
          {toEnglishPersona(persona)}
        </Tag>
      ),
      width: 140,
    },
  ];

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.role === "Administrator").length;
    const overdueUsers = users.filter((u) => (u.overdueCount || 0) > 0).length;
    const avgOnTime = Math.round(
      users.length
        ? users.reduce((s, u) => s + (u.onTimeRate || 0), 0) / users.length
        : 0
    );
    const personaKinds = Object.keys(
      users.reduce((acc, u) => {
        if (u.persona) acc[u.persona] = true;
        return acc;
      }, {})
    ).length;
    return { total, admins, overdueUsers, avgOnTime, personaKinds };
  }, [users]);

  const pendingColumns = [
    { title: t("admin.username"), dataIndex: "name", key: "name", width: 140 },
    { title: t("admin.email"), dataIndex: "email", key: "email", width: 200 },
    { title: t("admin.role"), dataIndex: "role", key: "role", width: 100 },
    { title: t("admin.registerTime") || "注册时间", dataIndex: "createdAt", key: "createdAt", width: 180, render: (t) => t ? new Date(t).toLocaleString() : '-' },
    {
        title: t("admin.action"),
        key: "action",
        width: 180,
        render: (_, record) => (
            <Space>
                <Button type="primary" size="small" onClick={() => handleApprove(record.userId, 'APPROVED')}>
                    {t("admin.approve") || "通过"}
                </Button>
                <Button danger size="small" onClick={() => handleApprove(record.userId, 'REJECTED')}>
                    {t("admin.reject") || "拒绝"}
                </Button>
            </Space>
        )
    }
  ];

  return (
    <PageShell
      title={t("admin.userManage")}
      subtitle={t("admin.persona") || "User Analytics & Management"}
      extra={
          <Button
              icon={<ReloadOutlined />}
              onClick={fetchUsers}
              loading={loading}
          >
              {t("admin.refresh")}
          </Button>
      }
    >
      
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={4}>
            <KPIStatCard
                title={t("admin.totalUsers")}
                value={stats.total}
                icon={<UserOutlined />}
                color={token.colorPrimary}
            />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
            <KPIStatCard
                title={t("admin.admins")}
                value={stats.admins}
                icon={<SafetyCertificateOutlined />}
                color={token.purple}
            />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
            <KPIStatCard
                title={t("admin.overdueUsers")}
                value={stats.overdueUsers}
                icon={<AlertOutlined />}
                color={token.colorError}
            />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
            <KPIStatCard
                title={t("admin.avgOnTime")}
                value={stats.avgOnTime}
                suffix="%"
                icon={<CheckCircleOutlined />}
                color={token.colorSuccess}
            />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
            <KPIStatCard
                title={t("admin.personaTypes")}
                value={stats.personaKinds}
                icon={<TagsOutlined />}
                color={token.colorWarning}
            />
        </Col>
        <Col xs={24} sm={12} md={8} lg={4}>
            <KPIStatCard
                title={t("admin.personaDistribution")}
                value={t("admin.view") || "View"}
                icon={<PieChartOutlined />}
                color={token.geekblue}
                onClick={() => setDistOpen(true)}
                hoverable
            />
        </Col>
      </Row>

      <Card
        bordered={false}
        style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary }}
        bodyStyle={{ padding: 0 }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
          tabBarStyle={{ padding: "0 24px", marginBottom: 0 }}
          items={[
            {
              key: "1",
              label: t("admin.allUsers"),
              children: (
                <div style={{ padding: "24px" }}>
                  <Input.Search
                    placeholder={t("admin.searchUserPlaceholder")}
                    allowClear
                    onSearch={(kw) => {
                      const keyword = String(kw || "").trim().toLowerCase();
                      const data = keyword
                        ? users.filter((u) => (u.name || "").toLowerCase().includes(keyword))
                        : users;
                      setTableData([...data]);
                    }}
                    style={{ maxWidth: 300, marginBottom: 16 }}
                  />

                  {isMobile ? (
                    <List
                      dataSource={tableData}
                      loading={loading}
                      pagination={{ pageSize: 7 }}
                      renderItem={(item) => (
                        <List.Item style={{ padding: 0, marginBottom: 16 }}>
                          <Card
                            hoverable
                            style={{ width: '100%', borderRadius: 12 }}
                            actions={[
                              <Button 
                                type="link" 
                                onClick={() => handlePersonaClick(item.persona, item.personaDescription)}
                              >
                                {t("admin.viewPersona")}
                              </Button>
                            ]}
                          >
                            <Card.Meta
                              avatar={<UserOutlined style={{ fontSize: 24, color: token.colorPrimary }} />}
                              title={<div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                  <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{item.name}</span>
                                  <Tag color={item.role === 'Administrator' ? 'purple' : 'blue'}>{item.role}</Tag>
                              </div>}
                              description={
                                <div style={{ marginTop: 8 }}>
                                  <div style={{ marginBottom: 4 }}>ID: {item.userId}</div>
                                  <div style={{ marginBottom: 4 }}>
                                    {t("admin.topCategory")}: {toEnglishCategory(item.topCategory)}
                                  </div>
                                  <div style={{ marginBottom: 4 }}>
                                    {t("admin.totalBorrows")}: <span style={{ fontWeight: 'bold' }}>{item.totalBorrows}</span>
                                  </div>
                                  <div style={{ marginBottom: 4 }}>
                                     {t("admin.notReturned")}: <Tag color={item.overdueCount > 0 ? "red" : "green"}>{item.overdueCount}</Tag>
                                  </div>
                                  <div style={{ marginBottom: 4 }}>
                                    {t("admin.onTimeRate")}: <Progress percent={item.onTimeRate} size="small" steps={5} strokeColor={item.onTimeRate >= 80 ? token.colorSuccess : token.colorError} />
                                  </div>
                                  <div>
                                    {t("admin.persona")}: <Tag color="blue">{toEnglishPersona(item.persona)}</Tag>
                                  </div>
                                </div>
                              }
                            />
                          </Card>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Table
                      dataSource={tableData}
                      columns={columns}
                      rowKey="userId"
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        position: ["bottomCenter"],
                      }}
                      scroll={{ x: 'max-content' }}
                      loading={loading}
                    />
                  )}
                </div>
              )
            },
            {
              key: "2",
              label: <Badge count={pendingUsers.length} offset={[10, 0]}>{t("admin.pendingApprovals") || "待审核"}</Badge>,
              children: (
                <div style={{ padding: "24px" }}>
                    <Table
                        dataSource={pendingUsers}
                        columns={pendingColumns}
                        rowKey="userId"
                        pagination={{ pageSize: 10 }}
                        scroll={{ x: 'max-content' }}
                        locale={{ emptyText: t("admin.noPendingUsers") || "无待审核用户" }}
                    />
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* ✅ Modal: can be closed normally */}
      <Modal
        open={modalVisible}
        title={`📘 ${t("admin.persona")}: ${selectedPersona ? toEnglishPersona(selectedPersona.persona) : t("admin.unknown")}`}
        onCancel={() => setModalVisible(false)}
        onOk={() => setModalVisible(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setModalVisible(false)}>
            {t("admin.close")}
          </Button>,
        ]}
        centered
        className="persona-modal"
      >
        <Paragraph
          style={{
            lineHeight: 1.8,
            fontSize: 15,
            color: token.colorText,
            background: token.colorFillAlter,
            borderRadius: token.borderRadius,
            padding: "15px",
            textAlign: "justify",
          }}
        >
          {selectedPersona ? toEnglishDescription(selectedPersona.description) : t("admin.noDescription")}
        </Paragraph>
      </Modal>

      <Modal
        open={distOpen}
        title={t("admin.chartTitle")}
        onCancel={() => setDistOpen(false)}
        footer={null}
        width={720}
      >
        {chartData.length === 0 ? (
          <p style={{ textAlign: "center", color: token.colorTextDescription }}>{t("admin.noPersonaData")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-m-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Modal>
    </PageShell>
  );
};

export default AdminUserManagePage;
