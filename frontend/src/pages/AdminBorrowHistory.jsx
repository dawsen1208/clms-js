// ✅ client/src/pages/AdminBorrowHistory.jsx
import { useEffect, useState } from "react";
import {
  Card,
  Table,
  Input,
  DatePicker,
  Select,
  Space,
  Button,
  message,
  Tag,
  Typography,
  Statistic,
  Empty,
  Segmented,
  Grid,
  List,
  Row,
  Col
} from "antd";
import { 
  SearchOutlined, 
  ReloadOutlined, 
  UserOutlined, 
  BookOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined
} from "@ant-design/icons";
import { getBorrowHistoryAllLibrary } from "../api";
import { useLanguage } from "../contexts/LanguageContext";
import dayjs from "dayjs";
import "./AdminBorrowHistory.css";

const { RangePicker } = DatePicker;
const { Title, Text: AntText } = Typography;
const { useBreakpoint } = Grid;

function AdminBorrowHistory() {
  const { t } = useLanguage();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search conditions
  const [searchText, setSearchText] = useState("");
  const [renewFilter, setRenewFilter] = useState(null);
  const [returnFilter, setReturnFilter] = useState(null);
  const [dateRange, setDateRange] = useState([]);

  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  const stats = {
    total: filtered.length,
    renewedYes: filtered.filter((r) => r.renewed).length,
    returnedYes: filtered.filter((r) => r.returned).length,
    notReturned: filtered.filter((r) => !r.returned).length,
  };

  /** ✅ Fetch all borrow records */
  const fetchRecords = async () => {
    if (!token) return message.warning(t("common.loginFirst"));
    try {
      setLoading(true);
      const res = await getBorrowHistoryAllLibrary(token);
      const list = res.data || [];
      setRecords(list);
      setFiltered(list);
    } catch (err) {
      console.error("❌ Failed to fetch borrow records:", err);
      message.error(t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  /** ✅ Search and filter */
  const handleSearch = () => {
    let data = [...records];

    // Username / ID fuzzy match
    if (searchText.trim()) {
      const keyword = searchText.toLowerCase();
      data = data.filter(
        (r) =>
          r.userName?.toLowerCase().includes(keyword) ||
          r.userId?.toLowerCase().includes(keyword)
      );
    }

    // Date range filter
    if (dateRange.length === 2) {
      const [start, end] = dateRange;
      data = data.filter((r) => {
        const borrowDate = dayjs(r.borrowDate);
        return borrowDate.isAfter(start) && borrowDate.isBefore(end);
      });
    }

    // Renewed or not
    if (renewFilter !== null) {
      data = data.filter((r) => r.renewed === renewFilter);
    }

    // Returned or not
    if (returnFilter !== null) {
      data = data.filter((r) => r.returned === returnFilter);
    }

    setFiltered(data);
  };

  /** ✅ Reset filters */
  const handleReset = () => {
    setSearchText("");
    setRenewFilter(null);
    setReturnFilter(null);
    setDateRange([]);
    setFiltered(records);
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  /** ✅ Table columns */
  const columns = [
    { title: t("admin.username"), dataIndex: "userName", key: "userName" },
    { title: t("admin.userId"), dataIndex: "userId", key: "userId" },
    { title: t("admin.bookTitle"), dataIndex: "bookTitle", key: "bookTitle" },
    {
      title: t("admin.borrowDate"),
      dataIndex: "borrowDate",
      key: "borrowDate",
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD") : "—"),
    },
    {
      title: t("admin.renewDate"),
      dataIndex: "renewDate",
      key: "renewDate",
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD") : "—"),
    },
    {
      title: t("admin.renewed"),
      dataIndex: "renewed",
      key: "renewed",
      render: (v) =>
        v ? <Tag color="blue">{t("admin.yes")}</Tag> : <Tag color="default">{t("admin.no")}</Tag>,
    },
    {
      title: t("admin.returnDate"),
      dataIndex: "returnDate",
      key: "returnDate",
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD") : "—"),
    },
    {
      title: t("admin.returned"),
      dataIndex: "returned",
      key: "returned",
      render: (v) =>
        v ? <Tag color="green">{t("admin.returned")}</Tag> : <Tag color="red">{t("admin.notReturned")}</Tag>,
    },
  ];

  return (
    <div className="admin-history-page" style={{ padding: "1.5rem" }}>
      <Card
        title={
          <div className="page-header">
            <Title level={2} className="page-modern-title" style={{ margin: 0 }}>
              {t("admin.history")}
            </Title>
            <AntText type="secondary" style={{ display: "block", marginTop: 8 }}>
              {t("admin.historyOverview")}
            </AntText>

            {/* 📊 统计卡片 */}
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
                    title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("admin.total")}</span>} 
                    value={stats.total} 
                    prefix={<BookOutlined style={{ color: "white" }} />} 
                    valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Card style={{
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                  border: "none",
                  boxShadow: "0 8px 25px rgba(139, 92, 246, 0.3)",
                  color: "white"
                }}>
                  <Statistic 
                    title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("admin.renewed")}</span>} 
                    value={stats.renewedYes} 
                    prefix={<SyncOutlined spin style={{ color: "white" }} />} 
                    valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8} lg={6}>
                <Card style={{
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  border: "none",
                  boxShadow: "0 8px 25px rgba(16, 185, 129, 0.3)",
                  color: "white"
                }}>
                  <Statistic 
                    title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("admin.returned")}</span>} 
                    value={stats.returnedYes} 
                    prefix={<CheckCircleOutlined style={{ color: "white" }} />} 
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
                    title={<span style={{ color: "rgba(255, 255, 255, 0.9)" }}>{t("admin.notReturned")}</span>} 
                    value={stats.notReturned} 
                    prefix={<CloseCircleOutlined style={{ color: "white" }} />} 
                    valueStyle={{ color: "white", fontWeight: "bold", fontSize: "32px" }}
                  />
                </Card>
              </Col>
            </Row>
          </div>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchRecords} loading={loading}>
            {t("admin.refresh")}
          </Button>
        }
        style={{ borderRadius: 16 }}
        bodyStyle={{ padding: "1.5rem" }}
      >
        <Space
          direction="vertical"
          size="middle"
          style={{ width: "100%", marginBottom: "1rem" }}
        >
          <Space wrap>
            <Input
              placeholder={t("admin.searchUserOrId")}
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 220 }}
            />
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={[t("admin.startDate"), t("admin.endDate")]}
            />
            <Segmented
              value={renewFilter === null ? "all" : renewFilter ? "yes" : "no"}
              onChange={(v) => setRenewFilter(v === "all" ? null : v === "yes")}
              options={[
                { label: t("admin.renewedAll"), value: "all" },
                { label: t("admin.yes"), value: "yes" },
                { label: t("admin.no"), value: "no" },
              ]}
            />
            <Segmented
              value={returnFilter === null ? "all" : returnFilter ? "yes" : "no"}
              onChange={(v) => setReturnFilter(v === "all" ? null : v === "yes")}
              options={[
                { label: t("admin.returnedAll"), value: "all" },
                { label: t("admin.yes"), value: "yes" },
                { label: t("admin.no"), value: "no" },
              ]}
            />
            <Button type="primary" onClick={handleSearch}>
              {t("common.search")}
            </Button>
            <Button onClick={handleReset}>{t("admin.reset")}</Button>
          </Space>
        </Space>

        {isMobile ? (
          <List
            dataSource={filtered}
            loading={loading}
            pagination={{ pageSize: 6 }}
            renderItem={(item) => (
              <List.Item style={{ padding: 0, marginBottom: 16 }}>
                <Card
                  hoverable
                  style={{ width: "100%", borderRadius: 12 }}
                >
                  <Card.Meta
                    title={
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "bold", fontSize: "16px", maxWidth: "70%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {item.bookTitle}
                        </span>
                        <Tag color={item.returned ? "green" : "red"}>
                          {item.returned ? t("admin.returnedYes") : t("admin.returnedNo")}
                        </Tag>
                      </div>
                    }
                    description={
                      <div style={{ marginTop: 8 }}>
                        <div style={{ marginBottom: 4 }}>
                          👤 {t("admin.borrower")}: {item.userName}
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          📅 {t("admin.borrowDate")}: {dayjs(item.borrowDate).format("YYYY-MM-DD")}
                        </div>
                        <div style={{ marginBottom: 4 }}>
                          🛑 {t("admin.dueDate")}: {dayjs(item.dueDate).format("YYYY-MM-DD")}
                        </div>
                        {item.returned && (
                          <div style={{ marginBottom: 4 }}>
                            ✅ {t("admin.returnDate")}: {dayjs(item.returnDate).format("YYYY-MM-DD")}
                          </div>
                        )}
                        <div style={{ marginBottom: 4 }}>
                          🔄 {t("admin.renewed")}:{" "}
                          <Tag color={item.renewed ? "blue" : "default"}>
                            {item.renewed ? t("admin.yes") : t("admin.no")}
                          </Tag>
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
            columns={columns}
            dataSource={filtered}
            loading={loading}
            rowKey="_id"
            pagination={{ pageSize: 6, showTotal: (total) => `${t("admin.totalRecords")} ${total} ${t("admin.recordsSuffix")}` }}
            locale={{ emptyText: <Empty description={t("admin.noRecords")} /> }}
            size="middle"
            scroll={{ x: 800 }}
          />
        )}
      </Card>
    </div>
  );
}

export default AdminBorrowHistory;
