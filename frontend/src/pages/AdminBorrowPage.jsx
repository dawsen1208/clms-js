// ✅ client/src/pages/AdminBorrowPage.jsx
import { useEffect, useState } from "react";
import {
  Card,
  Table,
  Button,
  Tag,
  Input,
  Space,
  Modal,
  message,
  Typography,
  Tooltip,
  Statistic,
  Divider,
  Grid,
  Row,
  Col
} from "antd";
import "./AdminBorrowPage.css";
import {
  ReloadOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  BookOutlined,
  ExclamationCircleOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  getActiveBorrowRecords,
  markBookReturned
} from "../api.js";
import { useLanguage } from "../contexts/LanguageContext";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

function AdminBorrowPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchText, setSearchText] = useState("");
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  
  const [modal, contextHolder] = Modal.useModal();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  /* =========================================================
     ✅ Fetch active borrows
     ========================================================= */
  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await getActiveBorrowRecords(token);
      const data = res.data || [];
      setRecords(data);
      setFiltered(data);
    } catch (err) {
      console.error("❌ Failed to fetch records:", err);
      message.error(t("admin.failedToLoadBorrows") || "Failed to load active borrows");
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     🔍 Search logic
     ========================================================= */
  useEffect(() => {
    let data = [...records];
    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      data = data.filter(
        (r) =>
          r.userName?.toLowerCase().includes(lower) ||
          r.bookTitle?.toLowerCase().includes(lower) ||
          String(r.userId).toLowerCase().includes(lower)
      );
    }
    setFiltered(data);
  }, [searchText, records]);

  /* =========================================================
     ↩️ Handle Return
     ========================================================= */
  const handleReturn = (record) => {
    modal.confirm({
      centered: true,
      title: t("admin.confirmReturnTitle") || "Confirm Return",
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          {t("admin.userLabel")}: <b>{record.userName}</b>
          <br />
          {t("admin.bookLabel")}: <b>{record.bookTitle}</b>
          <br />
          {t("admin.borrowDate")}: {dayjs(record.borrowedAt).format("YYYY-MM-DD")}
        </div>
      ),
      okText: t("admin.confirmReturn") || "Return",
      cancelText: t("admin.cancel"),
      onOk: async () => {
        try {
          await markBookReturned({ borrowRecordId: record._id }, token);
          message.success(t("admin.returnSuccess") || "Book returned successfully");
          await fetchRecords();
        } catch (err) {
          message.error(err?.response?.data?.message || t("admin.returnFailed") || "Return failed");
        }
      },
    });
  };

  /* =========================================================
     📋 Table columns
     ========================================================= */
  const columns = [
    {
      title: t("admin.username"),
      dataIndex: "userName",
      key: "userName",
      render: (text, record) => (
        <div>
           <div>{text || "—"}</div>
           <Text type="secondary" style={{ fontSize: 12 }}>ID: {record.userId}</Text>
        </div>
      ),
    },
    {
      title: t("admin.bookTitle"),
      dataIndex: "bookTitle",
      key: "bookTitle",
      ellipsis: true,
    },
    {
      title: t("admin.borrowDate"),
      dataIndex: "borrowedAt",
      key: "borrowedAt",
      render: (t) => t ? dayjs(t).format("YYYY-MM-DD") : "—",
      sorter: (a, b) => new Date(a.borrowedAt) - new Date(b.borrowedAt),
    },
    {
      title: t("admin.dueDate"),
      dataIndex: "dueDate",
      key: "dueDate",
      render: (t) => {
        const d = dayjs(t);
        const isOverdue = d.isBefore(dayjs());
        return (
          <Tag color={isOverdue ? "red" : "green"}>
            {d.format("YYYY-MM-DD")}
            {isOverdue && " (Overdue)"}
          </Tag>
        );
      },
      sorter: (a, b) => new Date(a.dueDate) - new Date(b.dueDate),
    },
    {
      title: t("admin.renewCount"),
      dataIndex: "renewCount",
      key: "renewCount",
      align: 'center',
    },
    {
      title: t("admin.actions"),
      key: "action",
      render: (_, record) => (
        <Button
          type="primary"
          ghost
          size="small"
          onClick={() => handleReturn(record)}
        >
          {t("admin.returnBook") || "Return"}
        </Button>
      ),
    },
  ];

  /* =========================================================
     🚀 Init
     ========================================================= */
  useEffect(() => {
    fetchRecords();
  }, []);

  return (
    <div className="admin-borrow-page fade-in" style={{ padding: "1.5rem" }}>
      {contextHolder}
      
      {/* 🔹 页面标题 */}
      <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Title level={2} className="page-modern-title" style={{ margin: 0 }}>
            {t("admin.borrowManagement") || "Borrow Management"}
          </Title>
          <Text type="secondary">{t("admin.manageActiveBorrows") || "Manage active loans and process returns"}</Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchRecords}
          loading={loading}
        >
          {t("admin.refresh")}
        </Button>
      </div>

      {/* 📊 统计卡片 (Row/Col Layout) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card style={{
            borderRadius: 16,
            background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
            border: "none",
            boxShadow: "0 8px 25px rgba(59, 130, 246, 0.3)",
            color: "white"
          }}>
            <Statistic 
              title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("admin.activeBorrows") || "Active Borrows"}</span>} 
              value={records.length} 
              prefix={<BookOutlined style={{ color: "white" }} />} 
              valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8} lg={6}>
          <Card style={{
            borderRadius: 16,
            background: "linear-gradient(135deg, #ef4444, #b91c1c)",
            border: "none",
            boxShadow: "0 8px 25px rgba(239, 68, 68, 0.3)",
            color: "white"
          }}>
            <Statistic 
              title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("admin.overdueBooks") || "Overdue Books"}</span>} 
              value={records.filter(r => dayjs(r.dueDate).isBefore(dayjs())).length} 
              prefix={<ExclamationCircleOutlined style={{ color: "white" }} />} 
              valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
            />
          </Card>
        </Col>
      </Row>

      <Card bordered={false} className="glass-card" style={{ marginBottom: 24, borderRadius: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <div style={{ marginBottom: 24 }}>
          <Input
            prefix={<SearchOutlined />}
            placeholder={t("admin.searchPlaceholder") || "Search user or book..."}
            style={{ width: 300 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </div>

        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="_id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total) => `${t("admin.total")} ${total} ${t("admin.items")}` }}
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
}

export default AdminBorrowPage;
