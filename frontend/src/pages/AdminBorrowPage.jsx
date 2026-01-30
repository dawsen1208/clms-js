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

const { Title, Text: AntText } = Typography;
const { useBreakpoint } = Grid;

function AdminBorrowPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchText, setSearchText] = useState("");
  // 🆕 Batch Mode State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

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
    // 🔄 Auto-exit batch mode on filter/search change
    if (isBatchMode) {
      setIsBatchMode(false);
      setSelectedRowKeys([]);
    }

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
          <AntText strong>{t("admin.userLabel")}: </AntText>{record.userName}
          <br />
          <AntText strong>{t("admin.bookLabel")}: </AntText>{record.bookTitle}
          <br />
          <AntText strong>{t("admin.borrowDate")}: </AntText>{dayjs(record.borrowedAt).format("YYYY-MM-DD")}
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
     ⚙️ Bulk Process
     ========================================================= */
  const enterBatchMode = () => {
    setIsBatchMode(true);
    setSelectedRowKeys([]);
  };

  const exitBatchMode = () => {
    setIsBatchMode(false);
    setSelectedRowKeys([]);
  };

  const executeBulkProcess = () => {
    if (selectedRowKeys.length === 0) {
      message.warning(t("admin.selectAtLeastOne"));
      return;
    }

    modal.confirm({
      centered: true,
      title: t("admin.bulkProcessTitle"),
      content: t("admin.bulkProcessContent").replace("{count}", selectedRowKeys.length),
      okText: t("admin.confirm"),
      cancelText: t("admin.cancel"),
      onOk: async () => {
        const hide = message.loading(t("admin.processing"), 0);
        let successCount = 0;
        let failCount = 0;

        try {
          const promises = selectedRowKeys.map(async (id) => {
             try {
                await markBookReturned({ borrowRecordId: id }, token);
                successCount++;
             } catch (e) {
                failCount++;
             }
          });

          await Promise.all(promises);

          if (failCount === 0) {
            message.success(t("admin.bulkSuccess").replace("{count}", successCount));
          } else {
            message.warning(
              t("admin.bulkPartialSuccess")
                .replace("{success}", successCount)
                .replace("{fail}", failCount)
            );
          }
          
          await fetchRecords();
          exitBatchMode();
        } catch (err) {
          console.error("Bulk process error:", err);
        } finally {
          hide();
        }
      },
    });
  };

  const rowSelection = isBatchMode
    ? {
        selectedRowKeys,
        onChange: (keys) => setSelectedRowKeys(keys),
      }
    : undefined;

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
           <AntText type="secondary" style={{ fontSize: 12 }}>ID: {record.userId}</AntText>
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
      
      <Card
        title={
          <div className="page-header">
            <Title level={2} className="page-modern-title" style={{ margin: 0 }}>
              {t("admin.borrowManagement") || "Borrow Management"}
            </Title>
            <AntText type="secondary" style={{ display: "block", marginTop: 8 }}>
              {t("admin.manageActiveBorrows") || "Manage active loans and process returns"}
            </AntText>
            
            {/* 📊 Statistic Cards */}
            <Row gutter={[16, 16]} style={{ marginTop: 24, marginBottom: 8 }}>
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
            
            {/* Bulk Process Button Row */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 16 }}>
              {isBatchMode && (
                <Button onClick={exitBatchMode}>
                  {t("admin.cancelBulkMode")}
                </Button>
              )}
              <Button type="primary" onClick={isBatchMode ? executeBulkProcess : enterBatchMode}>
                {isBatchMode 
                  ? `${t("admin.confirmBulkProcess")} (${selectedRowKeys.length})` 
                  : t("admin.bulkProcess") || "Bulk Process"}
              </Button>
            </div>
          </div>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchRecords}
            loading={loading}
          >
            {t("admin.refresh")}
          </Button>
        }
        style={{ borderRadius: 16 }}
        bodyStyle={{ padding: "1.5rem" }}
      >
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
          rowSelection={rowSelection}
          onChange={(pagination, filters, sorter, extra) => {
            if (isBatchMode) exitBatchMode();
          }}
        />
      </Card>
    </div>
  );
}

export default AdminBorrowPage;
