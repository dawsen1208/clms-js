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
} from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import { getBorrowHistoryAllLibrary } from "../api";
import { useLanguage } from "../contexts/LanguageContext";
import dayjs from "dayjs";
import "./AdminBorrowHistory.css";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

function AdminBorrowHistory() {
  const { t } = useLanguage();
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
            <Title level={2} className="page-modern-title" style={{ margin: 0 }}>{t("admin.history")}</Title>
            <Text type="secondary">{t("admin.historyOverview")}</Text>
            <div className="stats-grid">
              <Statistic title={t("admin.total")} value={stats.total} />
              <Statistic title={t("admin.renewed")} value={stats.renewedYes} />
              <Statistic title={t("admin.returned")} value={stats.returnedYes} valueStyle={{ color: "#52c41a" }} />
              <Statistic title={t("admin.notReturned")} value={stats.notReturned} valueStyle={{ color: "#ff4d4f" }} />
            </div>
          </div>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchRecords}>
            {t("admin.refresh")}
          </Button>
        }
        style={{
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
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
      </Card>
    </div>
  );
}

export default AdminBorrowHistory;
