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
import dayjs from "dayjs";
import "./AdminBorrowHistory.css";

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

function AdminBorrowHistory() {
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
    if (!token) return message.warning("Please log in first!");
    try {
      setLoading(true);
      const res = await getBorrowHistoryAllLibrary(token);
      const list = res.data || [];
      setRecords(list);
      setFiltered(list);
    } catch (err) {
      console.error("❌ Failed to fetch borrow records:", err);
      message.error("Failed to load borrow records");
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
    { title: "Username", dataIndex: "userName", key: "userName" },
    { title: "User ID", dataIndex: "userId", key: "userId" },
    { title: "Book Title", dataIndex: "bookTitle", key: "bookTitle" },
    {
      title: "Borrow Date",
      dataIndex: "borrowDate",
      key: "borrowDate",
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD") : "—"),
    },
    {
      title: "Renew Date",
      dataIndex: "renewDate",
      key: "renewDate",
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD") : "—"),
    },
    {
      title: "Renewed",
      dataIndex: "renewed",
      key: "renewed",
      render: (v) =>
        v ? <Tag color="blue">Yes</Tag> : <Tag color="default">No</Tag>,
    },
    {
      title: "Return Date",
      dataIndex: "returnDate",
      key: "returnDate",
      render: (v) => (v ? dayjs(v).format("YYYY-MM-DD") : "—"),
    },
    {
      title: "Returned",
      dataIndex: "returned",
      key: "returned",
      render: (v) =>
        v ? <Tag color="green">Returned</Tag> : <Tag color="red">Not returned</Tag>,
    },
  ];

  return (
    <div className="admin-history-page" style={{ padding: "1.5rem" }}>
      <Card
        title={
          <div className="page-header">
            <Title level={4} style={{ margin: 0 }}>Borrow Records</Title>
            <Text type="secondary">Overview and filters</Text>
            <div className="stats-grid">
              <Statistic title="Total" value={stats.total} />
              <Statistic title="Renewed" value={stats.renewedYes} />
              <Statistic title="Returned" value={stats.returnedYes} valueStyle={{ color: "#52c41a" }} />
              <Statistic title="Not Returned" value={stats.notReturned} valueStyle={{ color: "#ff4d4f" }} />
            </div>
          </div>
        }
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchRecords}>
            Refresh
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
              placeholder="Search Username / User ID"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 220 }}
            />
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              placeholder={["Start date", "End date"]}
            />
            <Segmented
              value={renewFilter === null ? "all" : renewFilter ? "yes" : "no"}
              onChange={(v) => setRenewFilter(v === "all" ? null : v === "yes")}
              options={[
                { label: "Renewed: All", value: "all" },
                { label: "Yes", value: "yes" },
                { label: "No", value: "no" },
              ]}
            />
            <Segmented
              value={returnFilter === null ? "all" : returnFilter ? "yes" : "no"}
              onChange={(v) => setReturnFilter(v === "all" ? null : v === "yes")}
              options={[
                { label: "Returned: All", value: "all" },
                { label: "Yes", value: "yes" },
                { label: "No", value: "no" },
              ]}
            />
            <Button type="primary" onClick={handleSearch}>
              Search
            </Button>
            <Button onClick={handleReset}>Reset</Button>
          </Space>
        </Space>

        <Table
          columns={columns}
          dataSource={filtered}
          loading={loading}
          rowKey="_id"
          pagination={{ pageSize: 6, showTotal: (t) => `Total ${t} records` }}
          locale={{ emptyText: <Empty description="No matching records" /> }}
          size="middle"
          scroll={{ x: 800 }}
        />
      </Card>
    </div>
  );
}

export default AdminBorrowHistory;
