// ✅ client/src/pages/BorrowPage.jsx
import { useEffect, useState, useMemo } from "react";
import {
  List,
  Card,
  Button,
  Spin,
  DatePicker,
  Modal,
  message,
  Tag,
  Typography,
  Statistic,
  Empty,
} from "antd";
import {
  ReloadOutlined,
  SyncOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import "./BorrowPage.css";
const { Title, Text } = Typography;
import {
  getBorrowedBooksLibrary,
  requestRenewLibrary,
  getUserRequestsLibrary,
} from "../api.js"; // ✅ 统一使用 /library 路由

function BorrowPage() {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [borrowed, setBorrowed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [renewModal, setRenewModal] = useState({ open: false, record: null });
  const [newDate, setNewDate] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [localPendingRenew, setLocalPendingRenew] = useState([]); // ✅ 本地乐观 Pending 列表
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  const stats = useMemo(() => {
    const total = borrowed.length;
    const pending = pendingRequests.filter((r) => r.status === "pending").length;
    const approved = pendingRequests.filter((r) => r.status === "approved").length;
    const rejected = pendingRequests.filter((r) => r.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [borrowed, pendingRequests]);

  /* =========================================================
     🏷️ 最近一次申请状态（不区分类型，用于行内 Tag 展示）
     ========================================================= */
  const getLatestRequestStatus = (bookId) => {
    const idStr = String(bookId);
    // 本地乐观优先：只要在本地 Pending 列表中，则显示 Pending
    if (localPendingRenew.includes(idStr)) return "pending";

    // 查找该书最近一次申请（后端按 updatedAt DESC 返回最多5条，不区分类型）
    const req = pendingRequests.find(
      (r) => String(r.bookId) === idStr
    );
    return req?.status || null;
  };

  const renderStatusTag = (bookId) => {
    const status = getLatestRequestStatus(bookId);
    if (!status) return null;
    const colorMap = { pending: "gold", approved: "green", rejected: "red" };
    const text = status.charAt(0).toUpperCase() + status.slice(1);
    return (
      <Tag color={colorMap[status] || "default"} style={{ marginLeft: 8 }}>
        {text}
      </Tag>
    );
  };

  /* =========================================================
     📘 获取借阅记录（未归还） + 用户申请状态
     ========================================================= */
  const fetchBorrowedBooks = async () => {
    if (!token) {
      message.error("Please log in first!");
      return;
    }
    try {
      setLoading(true);

      // ✅ 并行获取借阅数据 + 用户申请状态
      const [resBorrowed, resRequests] = await Promise.all([
        getBorrowedBooksLibrary(token),
        getUserRequestsLibrary(token),
      ]);

      const activeBorrowed = (resBorrowed.data || []).filter((r) => !r.returned);
      setBorrowed(activeBorrowed);
      setPendingRequests(resRequests.data || []);

      console.log("📚 当前借阅记录:", activeBorrowed);
      console.log("📨 用户待处理申请:", resRequests.data);
    } catch (err) {
      console.error("❌ Failed to fetch borrowed records:", err);
      message.error("Failed to load borrow list, please try again later.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     🔁 打开续借申请弹窗
     ========================================================= */
  const openRenewModal = (record) => {
    setRenewModal({ open: true, record });
    const defaultNewDate = record?.dueDate
      ? dayjs(record.dueDate).add(7, "day")
      : dayjs();
    setNewDate(defaultNewDate);
  };

  /* =========================================================
     📨 提交续借申请
     ========================================================= */
  const handleConfirmRenew = async () => {
    const record = renewModal.record;
    if (!record) return message.error("Borrow record not found");

    // ✅ 统一 bookId 类型（可能是对象）
    const bookId =
      typeof record.bookId === "object"
        ? record.bookId._id
        : record.bookId || record._id;

    if (!bookId) return message.error("Invalid book ID");
    if (!newDate) return message.warning("Please select a new due date");

    const maxDate = dayjs(record.dueDate).add(30, "day");
    if (newDate.isAfter(maxDate))
      return message.warning("Renewal date cannot exceed 30 days after original due date!");

    // ✅ 立即设置本地 Pending，按钮立刻禁用并显示 Pending
    const idStr = String(bookId);
    setLocalPendingRenew((prev) => (prev.includes(idStr) ? prev : [...prev, idStr]));

    try {
      await requestRenewLibrary(
        {
          type: "renew",
          bookId: record.bookId?._id || record.bookId || record._id,
          bookTitle: record.title || record.bookTitle,
        },
        token
      );

      message.success("📨 Renewal request submitted, awaiting admin approval.");
      setRenewModal({ open: false, record: null });
      fetchBorrowedBooks(); // ✅ 即时刷新状态（同步后端 Pending）
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to submit request, please try again later.";
      message.error(msg);
      // ❌ 提交失败则移除本地 Pending
      setLocalPendingRenew((prev) => prev.filter((x) => x !== idStr));
    }
  };

  /* =========================================================
     🔒 判断该书是否存在任一待处理申请（续借或归还）
     ========================================================= */
  const isPendingAny = (bookId) =>
    pendingRequests.some(
      (r) => String(r.bookId) === String(bookId) && r.status === "pending"
    );
  const isPendingRenewUI = (bookId) => {
    const idStr = String(bookId);
    // 本页的本地乐观续借 Pending 或后端任一 Pending（续借/归还）均禁用
    return localPendingRenew.includes(idStr) || isPendingAny(idStr);
  };

  /* =========================================================
     🚀 初始化加载（已去除8秒定时刷新）
     ========================================================= */
  useEffect(() => {
    fetchBorrowedBooks();
  }, []);

  /* =========================================================
     🧱 页面渲染
     ========================================================= */
  if (isMobile) {
    return (
      <div className="borrow-page-mobile" style={{ padding: "16px", background: "#f8fafc", minHeight: "100vh" }}>
        <Title level={4} style={{ marginBottom: "16px" }}>My Borrowings</Title>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
             <Card size="small" bodyStyle={{ padding: "12px" }}>
                 <Statistic title="Total Borrowed" value={stats.total} valueStyle={{ fontSize: "20px" }} />
             </Card>
             <Card size="small" bodyStyle={{ padding: "12px" }}>
                  <Statistic title="Pending" value={stats.pending} prefix={<ClockCircleOutlined />} valueStyle={{ fontSize: "20px", color: "#faad14" }} />
             </Card>
        </div>

        {loading ? (
           <Spin size="large" style={{ display: "block", margin: "2rem auto" }} />
        ) : borrowed.length > 0 ? (
           <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
             {borrowed.map((record) => {
               const bookIdNormalized =
                 typeof record.bookId === "object"
                   ? record.bookId?._id
                   : record.bookId;
               const pending = isPendingRenewUI(bookIdNormalized);
               const bookIdForLink = bookIdNormalized || null;

               return (
                 <div key={record._id} style={{ 
                    background: "#fff", 
                    padding: "16px", 
                    borderRadius: "12px", 
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                 }}>
                   <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                      <div style={{ flex: 1, marginRight: "12px" }}>
                        <div style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b", marginBottom: "4px", lineHeight: "1.4" }}>
                           {bookIdForLink ? (
                              <Link to={`/book/${bookIdForLink}`} style={{ color: "inherit", textDecoration: "none" }}>
                                {record.title || "Unknown Book"}
                              </Link>
                           ) : (
                              record.title || "Unknown Book"
                           )}
                        </div>
                        <div style={{ fontSize: "13px", color: "#64748b" }}>
                          Due: {record.dueDate ? dayjs(record.dueDate).format("YYYY-MM-DD") : "N/A"}
                        </div>
                      </div>
                      {renderStatusTag(bookIdNormalized)}
                   </div>
                   
                   <div style={{ display: "flex", gap: "12px" }}>
                      {pending ? (
                        <Button 
                          block 
                          disabled 
                          icon={<ClockCircleOutlined />} 
                          style={{ borderRadius: "8px", background: "#f1f5f9", border: "none", color: "#94a3b8" }}
                        >
                          Request Pending
                        </Button>
                      ) : (
                        <Button 
                          block 
                          type="primary" 
                          icon={<SyncOutlined />} 
                          onClick={() => openRenewModal(record)}
                          style={{ borderRadius: "8px" }}
                        >
                          Renew Loan
                        </Button>
                      )}
                   </div>
                 </div>
               );
             })}
           </div>
        ) : (
           <Empty description="No borrow records" />
        )}

        <Modal
          title={`Apply for Renewal: ${renewModal.record?.title || ""}`}
          open={renewModal.open}
          onCancel={() => setRenewModal({ open: false, record: null })}
          onOk={handleConfirmRenew}
          okText="Submit Request"
          cancelText="Cancel"
          centered
          destroyOnClose
          width="90%"
        >
          <p style={{ marginBottom: 10 }}>
            Please select a new due date:
          </p>
          <DatePicker
            style={{ width: "100%" }}
            format="YYYY-MM-DD"
            value={newDate}
            onChange={(date) => setNewDate(date)}
            disabledDate={(date) => {
              if (!renewModal.record?.dueDate) return false;
              const min = dayjs(renewModal.record.dueDate);
              const max = dayjs(renewModal.record.dueDate).add(30, "day");
              return date.isBefore(min) || date.isAfter(max);
            }}
          />
        </Modal>
      </div>
    );
  }

  return (
    <div className="borrow-page" style={{ padding: "1.5rem" }}>
      <Card
        title={
          <div className="page-header">
            <Title level={4} style={{ margin: 0 }}>Current Borrowed Books</Title>
            <Text type="secondary">Renewal requests and statuses</Text>
            <div className="stats-grid">
              <Statistic title="Total" value={stats.total} />
              <Statistic title="Pending" value={stats.pending} valueStyle={{ color: "#faad14" }} />
              <Statistic title="Approved" value={stats.approved} valueStyle={{ color: "#52c41a" }} />
              <Statistic title="Rejected" value={stats.rejected} valueStyle={{ color: "#ff4d4f" }} />
            </div>
          </div>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchBorrowedBooks}
            loading={loading}
          >
            Refresh
          </Button>
        }
        style={{
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        {loading ? (
          <Spin size="large" style={{ display: "block", margin: "2rem auto" }} />
        ) : borrowed.length > 0 ? (
          <List
            dataSource={borrowed}
            bordered
            renderItem={(record) => {
              // ✅ 统一 bookId：后端已返回 bookId（string），兼容对象与字符串
              const bookIdNormalized =
                typeof record.bookId === "object"
                  ? record.bookId?._id
                  : record.bookId;
              const pending = isPendingRenewUI(bookIdNormalized);
              // 仅用于详情链接：必须是书籍ID
              const bookIdForLink = bookIdNormalized || null;
              return (
                <List.Item
                  actions={[
                    pending ? (
                      <Button
                        disabled
                        icon={<ClockCircleOutlined />}
                        style={{ borderRadius: 6, background: "#f5f5f5", color: "#8c8c8c" }}
                      >
                        Pending
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        icon={<SyncOutlined />}
                        onClick={() => openRenewModal(record)}
                      >
                        Request Renew
                      </Button>
                    ),
                  ]}
                >
                  <List.Item.Meta
                  title={
                      (
                        <>
                          {bookIdForLink ? (
                            <Link
                              to={`/book/${bookIdForLink}`}
                              style={{ color: "#1677ff", fontWeight: 600 }}
                            >
                              {record.title || "Unknown Book"}
                            </Link>
                          ) : (
                            <span style={{ color: "#333", fontWeight: 600 }}>
                              {record.title || "Unknown Book"}
                            </span>
                          )}
                          {renderStatusTag(bookIdNormalized)}
                        </>
                      )
                    }
                    description={`📅 Due Date: ${
                      record.dueDate
                        ? dayjs(record.dueDate).format("YYYY-MM-DD")
                        : "N/A"
                    }`}
                  />
                </List.Item>
              );
            }}
          />
        ) : (
          <Empty description="No borrow records" />
        )}
      </Card>

      <Modal
        title={`Apply for Renewal: ${renewModal.record?.title || ""}`}
        open={renewModal.open}
        onCancel={() => setRenewModal({ open: false, record: null })}
        onOk={handleConfirmRenew}
        okText="Submit Request"
        cancelText="Cancel"
        centered
        destroyOnClose
      >
        <p style={{ marginBottom: 10 }}>
          Please select a new due date (request only, not applied immediately):
        </p>
        <DatePicker
          style={{ width: "100%" }}
          format="YYYY-MM-DD"
          value={newDate}
          onChange={(date) => setNewDate(date)}
          disabledDate={(date) => {
            if (!renewModal.record?.dueDate) return false;
            const min = dayjs(renewModal.record.dueDate);
            const max = dayjs(renewModal.record.dueDate).add(30, "day");
            return date.isBefore(min) || date.isAfter(max);
          }}
        />
      </Modal>
    </div>
  );
}

export default BorrowPage;
