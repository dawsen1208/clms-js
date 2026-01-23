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
  Statistic,
  Divider,
  Space,
} from "antd";
import {
  ReloadOutlined,
  SearchOutlined,
  UserOutlined,
  BookOutlined,
} from "@ant-design/icons";
import { getUserAnalytics } from "../api";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import "./AdminUserManagePage.css"; // ✅ animation styles

const { Paragraph, Title, Text } = Typography;
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8854d0"];

const AdminUserManagePage = () => {
  const [users, setUsers] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState(null);
  const [distOpen, setDistOpen] = useState(false);

  let token = localStorage.getItem("token") || sessionStorage.getItem("token");
  if (token?.startsWith('"')) {
    try {
      token = JSON.parse(token);
    } catch {}
  }

  /* =========================================================
     📡 Load user data
     ========================================================= */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getUserAnalytics(token);
      const list = res.data || [];
      setUsers(list);
      setTableData(list);
    } catch (err) {
      console.error("❌ Failed to load users:", err);
      message.error("Failed to load users, please confirm admin login");
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

  // 🔤 Helpers: translate common Chinese labels to English for display
  const toEnglishCategory = (text) => (text === "未知" ? "Unknown" : text);
  const toEnglishPersona = (p) => {
    if (!p) return "Unknown";
    const s = String(p).trim();
    // Handle common variants by substring match
    if (/普通读者/.test(s)) return "Regular Reader";
    if (/高频借阅者/.test(s)) return "Frequent Borrower";
    if (/新用户/.test(s)) return "New User";
    if (/管理员/.test(s)) return "Administrator";
    if (/未知/.test(s)) return "Unknown";
    return s;
  };
  const toEnglishDescription = (d) => {
    if (!d) return "No detailed persona description.";
    let t = String(d);
    t = t.replace(/阅读类型多样，?兴趣广泛。?/g, "Reads diverse types; broad interests.");
    t = t.replace(/偏好商业类书籍。?/g, "Prefers business books.");
    t = t.replace(/偏好烹饪类书籍。?/g, "Prefers cooking books.");
    t = t.replace(/偏好小说(与)?文学类书籍。?/g, "Prefers fiction and literature.");
    t = t.replace(/新用户，?阅读记录较少。?/g, "New user with limited reading history.");
    t = t.replace(/借阅频率较高，?习惯按时归还。?/g, "Frequent borrower; returns on time.");
    t = t.replace(/有逾期记录，?需要提醒。?/g, "Has overdue records; needs reminders.");
    t = t.replace(/未知/g, "Unknown");
    return t;
  };

  /* =========================================================
     💡 Click persona tag => open description modal
     ========================================================= */
  const handlePersonaClick = (persona, description) => {
    setSelectedPersona({ persona, description });
    setModalVisible(true);
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
    { title: "Username", dataIndex: "name", key: "name", width: 140 },
    { title: "User ID", dataIndex: "userId", key: "userId", width: 120 },
    { title: "Role", dataIndex: "role", key: "role", width: 120 },
    {
      title: "Top Category",
      dataIndex: "topCategory",
      key: "topCategory",
      render: (text) => toEnglishCategory(text) || "—",
      width: 150,
    },
    { title: "Total Borrows", dataIndex: "totalBorrows", key: "totalBorrows", width: 120 },
    {
      title: "Not Returned",
      dataIndex: "overdueCount",
      key: "overdueCount",
      render: (v) => <Tag color={v > 0 ? "red" : "green"}>{v}</Tag>,
      width: 100,
    },
    {
      title: "On-time Return Rate",
      dataIndex: "onTimeRate",
      key: "onTimeRate",
      render: (v) => (
        <Progress
          percent={v}
          size="small"
          strokeColor={v >= 80 ? "#52c41a" : "#ff4d4f"}
          status={v >= 80 ? "active" : "exception"}
        />
      ),
      width: 160,
    },
    {
      title: "Persona",
      dataIndex: "persona",
      key: "persona",
      render: (persona, record) => (
        <Tag
          color="blue"
          className="persona-tag"
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

  return (
    <div className="admin-user-page" style={{ padding: "1.5rem", minHeight: "100vh" }}>
      <Card
        title={
          <div className="page-header">
            <Title level={4} style={{ margin: 0 }}>User Management</Title>
            <Text type="secondary">Borrow personas and behaviors</Text>
            <Row gutter={[12, 12]} align="middle">
              <Col xs={12} md={8} lg={8}><Statistic title="Total Users" value={stats.total} /></Col>
              <Col xs={12} md={8} lg={8}><Statistic title="Admins" value={stats.admins} /></Col>
              <Col xs={12} md={8} lg={8}><Statistic title="Overdue Users" value={stats.overdueUsers} valueStyle={{ color: "#ff4d4f" }} /></Col>
            </Row>
            <Row gutter={[12, 12]} align="middle" style={{ marginTop: 8 }}>
              <Col xs={12} md={8} lg={8}><Statistic title="Avg On-time%" value={stats.avgOnTime} suffix="%" valueStyle={{ color: stats.avgOnTime >= 80 ? "#52c41a" : "#faad14" }} /></Col>
              <Col xs={12} md={8} lg={8}><Statistic title="Persona Types" value={stats.personaKinds} /></Col>
              <Col xs={12} md={8} lg={8}>
                <Card hoverable size="small" title="Persona Distribution" onClick={() => setDistOpen(true)} style={{ borderRadius: 12 }}>
                  <Text type="secondary">Click to view pie chart</Text>
                </Card>
              </Col>
            </Row>
          </div>
        }
        style={{ borderRadius: "16px" }}
        bodyStyle={{ padding: "1.5rem" }}
      >
        {loading ? (
          <Spin
            size="large"
            style={{ display: "block", margin: "3rem auto" }}
          />
        ) : (
          <>
            <Input.Search
              placeholder="Search by username"
              allowClear
              onSearch={(kw) => {
                const keyword = String(kw || "").trim().toLowerCase();
                const data = keyword
                  ? users.filter((u) => (u.name || "").toLowerCase().includes(keyword))
                  : users;
                setTableData([...data]);
              }}
              style={{ maxWidth: 280, marginBottom: 12 }}
            />

            <Table
              dataSource={tableData}
              columns={columns}
              rowKey="userId"
              pagination={{
                pageSize: 7,
                showSizeChanger: false,
                position: ["bottomCenter"],
              }}
              scroll={{ x: 950 }}
              bordered
              locale={{
                emptyText: "No user data, please check records or login state",
              }}
              style={{
                minHeight: "540px",
                borderRadius: "10px",
              }}
            />

            
          </>
        )}
      </Card>

      {/* ✅ Modal: can be closed normally */}
      <Modal
        open={modalVisible}
        title={`📘 Persona: ${selectedPersona ? toEnglishPersona(selectedPersona.persona) : "Unknown"}`}
        onCancel={() => setModalVisible(false)}
        onOk={() => setModalVisible(false)} // ✅ Allow OK/Close to dismiss
        footer={[
          <Button key="close" type="primary" onClick={() => setModalVisible(false)}>
            Close
          </Button>,
        ]}
        centered
        className="persona-modal"
      >
        <Paragraph
          style={{
            lineHeight: 1.8,
            fontSize: 15,
            color: "#333",
            background:
              "linear-gradient(135deg, rgba(102,126,234,0.15), rgba(118,75,162,0.15))",
            borderRadius: "10px",
            padding: "15px",
            boxShadow: "inset 0 0 8px rgba(0,0,0,0.05)",
            textAlign: "justify",
          }}
        >
          {selectedPersona ? toEnglishDescription(selectedPersona.description) : "No detailed persona description."}
        </Paragraph>
      </Modal>

      <Modal
        open={distOpen}
        title="Persona Distribution"
        onCancel={() => setDistOpen(false)}
        footer={null}
        width={720}
      >
        {chartData.length === 0 ? (
          <p style={{ textAlign: "center", color: "#999" }}>No persona data</p>
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
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </Modal>
    </div>
  );
};

export default AdminUserManagePage;
