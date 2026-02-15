// ✅ client/src/pages/AdminBorrowHistory.jsx
import { useEffect, useState, useCallback } from "react";
import {
  Card,
  Table,
  Input,
  DatePicker,
  Button,
  message,
  Tag,
  Typography,
  Empty,
  Segmented,
  Grid,
  List,
  Row,
  Col,
  theme
} from "antd";
import { 
  SearchOutlined, 
  ReloadOutlined, 
  BookOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined
} from "@ant-design/icons";
import { getBorrowHistoryAllLibrary } from "../api";
import { useLanguage } from "../contexts/LanguageContext";
import dayjs from "dayjs";
import EditorialPageShell from "../components/common/EditorialPageShell";
import StatCard from "../components/cards/StatCard";

const { RangePicker } = DatePicker;
const { Text: AntText } = Typography;
const { useBreakpoint } = Grid;
const { useToken } = theme;

function AdminBorrowHistory() {
  const { t } = useLanguage();
  const { token } = useToken();
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

  const authToken = sessionStorage.getItem("token") || localStorage.getItem("token");

  const stats = {
    total: filtered.length,
    renewedYes: filtered.filter((r) => r.renewed).length,
    returnedYes: filtered.filter((r) => r.returned).length,
    notReturned: filtered.filter((r) => !r.returned).length,
  };

  /** ✅ Fetch all borrow records */
  const fetchRecords = useCallback(async () => {
    if (!authToken) return message.warning(t("common.loginFirst"));
    try {
      setLoading(true);
      const res = await getBorrowHistoryAllLibrary(authToken);
      const list = res.data || [];
      setRecords(list);
      setFiltered(list);
    } catch (err) {
      console.error("❌ Failed to fetch borrow records:", err);
      message.error(t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  }, [authToken, t]);

  /** ✅ Search and filter */
  const handleSearch = useCallback(() => {
    let data = [...records];

    // Username / ID fuzzy match
    if (searchText.trim()) {
      const keyword = searchText.toLowerCase();
      data = data.filter(
        (r) =>
          r.userName?.toLowerCase().includes(keyword) ||
          r.userId?.toLowerCase().includes(keyword) ||
          r.bookTitle?.toLowerCase().includes(keyword)
      );
    }

    // Date range filter
    if (dateRange && dateRange.length === 2) {
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
  }, [records, searchText, dateRange, renewFilter, returnFilter]);

  /** ✅ Reset filters */
  const handleReset = () => {
    setSearchText("");
    setRenewFilter(null);
    setReturnFilter(null);
    setDateRange([]);
    setFiltered(records);
  };

  useEffect(() => {
    handleSearch();
  }, [handleSearch]); // Auto-filter on change

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

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
      sorter: (a, b) => new Date(a.borrowDate) - new Date(b.borrowDate),
    },
    {
      title: t("admin.renewed"),
      dataIndex: "renewed",
      key: "renewed",
      render: (v) =>
        v ? <Tag color="blue">{t("admin.yes")}</Tag> : <Tag color="default">{t("admin.no")}</Tag>,
      filters: [
        { text: t("admin.yes"), value: true },
        { text: t("admin.no"), value: false },
      ],
      onFilter: (value, record) => record.renewed === value,
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
      filters: [
        { text: t("admin.returned"), value: true },
        { text: t("admin.notReturned"), value: false },
      ],
      onFilter: (value, record) => record.returned === value,
    },
  ];

  return (
    <EditorialPageShell
      title={t("admin.history")}
      subtitle={t("admin.historyOverview")}
      headerAction={
        <Button icon={<ReloadOutlined />} onClick={fetchRecords} loading={loading}>
          {t("admin.refresh")}
        </Button>
      }
    >

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title={t("admin.total")}
            value={stats.total}
            color={token.colorPrimary}
            loading={loading}
            trend={0}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title={t("admin.renewed")}
            value={stats.renewedYes}
            color={token.colorWarning}
            loading={loading}
            trend={0}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title={t("admin.returned")}
            value={stats.returnedYes}
            color={token.colorSuccess}
            loading={loading}
            trend={0}
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <StatCard
            title={t("admin.notReturned")}
            value={stats.notReturned}
            color={token.colorError}
            loading={loading}
            trend={0}
          />
        </Col>
      </Row>

      <Card style={{ borderRadius: token.borderRadiusLG, boxShadow: token.boxShadowTertiary }}>
        <div style={{ marginBottom: 24 }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Input
                placeholder={t("admin.searchUserOrId")}
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={24} md={8}>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder={[t("admin.startDate"), t("admin.endDate")]}
                style={{ width: "100%" }}
              />
            </Col>
            <Col xs={24} md={8} style={{ display: 'flex', gap: 8 }}>
               <Button onClick={handleReset}>{t("admin.reset")}</Button>
            </Col>
          </Row>
        </div>

        {isMobile ? (
          <List
            dataSource={filtered}
            loading={loading}
            pagination={{ pageSize: 6 }}
            renderItem={(item) => (
              <List.Item style={{ padding: 0, marginBottom: 16 }}>
                <Card
                  hoverable
                  style={{ width: "100%", borderRadius: 12, border: `1px solid ${token.colorBorderSecondary}` }}
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
            pagination={{ pageSize: 10, showTotal: (total) => `${t("admin.totalRecords")} ${total} ${t("admin.recordsSuffix")}` }}
            locale={{ emptyText: <Empty description={t("admin.noRecords")} /> }}
            size="middle"
            scroll={{ x: 800 }}
          />
        )}
      </Card>
    </EditorialPageShell>
  );
}

export default AdminBorrowHistory;
