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
  RollbackOutlined,
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import "./BorrowPage.css";
import { Grid } from "antd";
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
import {
  getBorrowedBooksLibrary,
  requestRenewLibrary,
  requestReturnLibrary,
  getUserRequestsLibrary,
} from "../api.js"; // ✅ 统一使用 /library 路由
import { useLanguage } from "../contexts/LanguageContext"; // ✅ Import Hook

function BorrowPage() {
  const { t } = useLanguage(); // ✅ Use Hook
  const { Title, Text } = Typography;
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [borrowed, setBorrowed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [renewModal, setRenewModal] = useState({ open: false, record: null });
  const [returnModal, setReturnModal] = useState({ open: false, record: null }); // ✅ Return Modal
  const [newDate, setNewDate] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [localPendingRenew, setLocalPendingRenew] = useState([]); // ✅ 本地乐观 Pending 列表 (Renew)
  const [localPendingReturn, setLocalPendingReturn] = useState([]); // ✅ 本地乐观 Pending 列表 (Return)
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
      message.error(t("common.loginFirst"));
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
      message.error(t("common.failedToLoad"));
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
    if (!record) return message.error(t("borrow.notFound"));

    // ✅ 统一 bookId 类型（可能是对象）
    const bookId =
      typeof record.bookId === "object"
        ? record.bookId._id
        : record.bookId || record._id;

    if (!bookId) return message.error(t("borrow.invalidId"));
    if (!newDate) return message.warning(t("borrow.selectDate"));

    const maxDate = dayjs(record.dueDate).add(30, "day");
    if (newDate.isAfter(maxDate))
      return message.warning(t("borrow.renewalLimit"));

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

      message.success(t("borrow.renewalSubmitted"));
      setRenewModal({ open: false, record: null });
      fetchBorrowedBooks(); // ✅ 即时刷新状态（同步后端 Pending）
    } catch (err) {
      const msg = err.response?.data?.message || t("borrow.submitFailed");
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
     🔒 判断是否处于 Pending 状态 (UI禁用 - 通用)
     ========================================================= */
  const isPendingUI = (bookId) => {
    const idStr = String(bookId);
    return (
      localPendingRenew.includes(idStr) ||
      localPendingReturn.includes(idStr) ||
      isPendingAny(idStr)
    );
  };

  /* =========================================================
     🔙 打开归还确认弹窗
     ========================================================= */
  const openReturnModal = (record) => {
    setReturnModal({ open: true, record });
  };

  /* =========================================================
     📨 提交归还申请
     ========================================================= */
  const handleConfirmReturn = async () => {
    const record = returnModal.record;
    if (!record) return;

    // ✅ 统一 bookId
    const bookId =
      typeof record.bookId === "object"
        ? record.bookId._id
        : record.bookId || record._id;

    const idStr = String(bookId);
    // ✅ 立即设置本地 Return Pending
    setLocalPendingReturn((prev) => (prev.includes(idStr) ? prev : [...prev, idStr]));

    try {
      await requestReturnLibrary(
        {
          bookId,
          bookTitle: record.title || record.bookTitle,
        },
        token
      );
      message.success(t("borrow.returnSubmitted"));
      setReturnModal({ open: false, record: null });
      fetchBorrowedBooks();
    } catch (err) {
      const msg = err.response?.data?.message || t("borrow.submitFailed");
      message.error(msg);
      // ❌ 失败移除本地 Pending
      setLocalPendingReturn((prev) => prev.filter((x) => x !== idStr));
    }
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
      <div className="borrow-page-mobile page-container" style={{ minHeight: "100vh", background: "#f8fafc" }}>
        <Title level={2} className="page-modern-title" style={{ marginBottom: "16px" }}>{t("titles.myBorrowings")}</Title>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
             <Card size="small" bodyStyle={{ padding: "12px", textAlign: "center" }} style={{ borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                 <Statistic title={t("common.total")} value={stats.total} valueStyle={{ fontSize: "24px", fontWeight: "bold" }} />
             </Card>
             <Card size="small" bodyStyle={{ padding: "12px", textAlign: "center" }} style={{ borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                  <Statistic title={t("common.pending")} value={stats.pending} prefix={<ClockCircleOutlined />} valueStyle={{ fontSize: "24px", fontWeight: "bold", color: "#faad14" }} />
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
                        <div className="text-clamp-2" style={{ fontSize: "16px", fontWeight: "600", color: "#1e293b", marginBottom: "4px", lineHeight: "1.4" }}>
                           {bookIdForLink ? (
                              <Link to={`/book/${bookIdForLink}`} style={{ color: "inherit", textDecoration: "none" }}>
                                {record.title || t("common.unknown")}
                              </Link>
                           ) : (
                              record.title || t("common.unknown")
                           )}
                        </div>
                        <div style={{ fontSize: "13px", color: "#64748b" }}>
                          {t("borrow.dueDate")}: {record.dueDate ? dayjs(record.dueDate).format("YYYY-MM-DD") : "N/A"}
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
                          style={{ borderRadius: "8px", background: "#f1f5f9", border: "none", color: "#94a3b8", height: "44px" }}
                        >
                          {t("borrow.renewPending")}
                        </Button>
                      ) : (
                        <Button 
                          block 
                          type="primary" 
                          icon={<SyncOutlined />} 
                          onClick={() => openRenewModal(record)}
                          style={{ borderRadius: "8px", height: "44px" }}
                        >
                          {t("borrow.renewLoan")}
                        </Button>
                      )}

                      {/* ✅ Return Button for Mobile */}
                      {pending ? (
                         <Button
                           block
                           disabled
                           icon={<ClockCircleOutlined />}
                           style={{ borderRadius: "8px", background: "#f1f5f9", border: "none", color: "#94a3b8", height: "44px" }}
                         >
                           {t("borrow.returnPending")}
                         </Button>
                      ) : (
                         <Button 
                           block 
                           danger
                           type="default"
                           icon={<RollbackOutlined />} 
                           onClick={() => openReturnModal(record)}
                           style={{ borderRadius: "8px", height: "44px", borderColor: "#ff4d4f", color: "#ff4d4f" }}
                         >
                           {t("borrow.requestReturn")}
                         </Button>
                      )}
                    </div>
                 </div>
               );
             })}
           </div>
        ) : (
           <Empty description={t("common.unknown")} />
        )}

        <Modal
          title={`${t("titles.applyRenew")}: ${renewModal.record?.title || ""}`}
          open={renewModal.open}
          onCancel={() => setRenewModal({ open: false, record: null })}
          onOk={handleConfirmRenew}
          okText={t("common.submit")}
          cancelText={t("common.cancel")}
          centered
          destroyOnClose
          width="90%"
        >
          <p style={{ marginBottom: 10 }}>
            {t("borrow.selectDate")}:
          </p>
          <DatePicker
            style={{ width: "100%", height: "44px" }}
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
            <Title level={2} className="page-modern-title" style={{ margin: 0 }}>{t("titles.currentBorrowings")}</Title>
            <div style={{ marginBottom: 16 }}>
              <Text type="secondary">{t("borrow.requestStatus")}</Text>
            </div>
            <div className="stats-grid">
              <Statistic title={t("admin.total")} value={stats.total} />
              <Statistic title={t("admin.pending")} value={stats.pending} valueStyle={{ color: "#faad14" }} />
              <Statistic title={t("admin.approved")} value={stats.approved} valueStyle={{ color: "#52c41a" }} />
              <Statistic title={t("admin.rejected")} value={stats.rejected} valueStyle={{ color: "#ff4d4f" }} />
            </div>
          </div>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchBorrowedBooks}
            loading={loading}
          >
            {t("common.refresh")}
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
              const isPending = isPendingUI(bookIdNormalized);
              
              // Determine which type of pending
              const pendingReq = pendingRequests.find(r => String(r.bookId) === String(bookIdNormalized) && r.status === 'pending');
              const isRenewPending = localPendingRenew.includes(String(bookIdNormalized)) || (pendingReq && pendingReq.type === 'renew');
              const isReturnPending = localPendingReturn.includes(String(bookIdNormalized)) || (pendingReq && pendingReq.type === 'return');

              return (
                <List.Item
                  actions={[
                    isRenewPending ? (
                      <Button
                        disabled
                        icon={<ClockCircleOutlined />}
                        style={{ borderRadius: 6, background: "#f5f5f5", color: "#8c8c8c" }}
                      >
                        {t("borrow.renewPending")}
                      </Button>
                    ) : isReturnPending ? (
                       <Button disabled style={{ visibility: "hidden", width: 0, padding: 0, border: 0 }} />
                    ) : (
                      <Button
                        type="primary"
                        icon={<SyncOutlined />}
                        style={{ borderRadius: 6 }}
                        onClick={() => openRenewModal(record)}
                        disabled={isPending}
                      >
                        {t("borrow.renewLoan")}
                      </Button>
                    ),
                    
                    isReturnPending ? (
                      <Button
                        disabled
                        icon={<ClockCircleOutlined />}
                        style={{ borderRadius: 6, background: "#f5f5f5", color: "#8c8c8c" }}
                      >
                        {t("borrow.returnPending")}
                      </Button>
                    ) : isRenewPending ? (
                       <Button disabled style={{ visibility: "hidden", width: 0, padding: 0, border: 0 }} />
                    ) : (
                      <Button
                        type="primary"
                        danger
                        icon={<RollbackOutlined />}
                        style={{ borderRadius: 6 }}
                        onClick={() => openReturnModal(record)}
                        disabled={isPending}
                      >
                        {t("borrow.requestReturn")}
                      </Button>
                    )
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
                              {record.title || t("common.unknown")}
                            </Link>
                          ) : (
                            <span style={{ color: "#333", fontWeight: 600 }}>
                              {record.title || t("common.unknown")}
                            </span>
                          )}
                          {renderStatusTag(bookIdNormalized)}
                        </>
                      )
                    }
                    description={`📅 ${t("borrow.dueDate")}: ${
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
          <Empty description={t("borrow.noBorrowRecords")} />
        )}
      </Card>

      <Modal
          title={`${t("titles.applyRenew")}: ${renewModal.record?.title || ""}`}
          open={renewModal.open}
          onCancel={() => setRenewModal({ open: false, record: null })}
          onOk={handleConfirmRenew}
          okText={t("common.submit")}
          cancelText={t("common.cancel")}
          centered
          destroyOnClose
        >
          <p style={{ marginBottom: 10 }}>
            {t("borrow.selectDate")}:
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

        {/* ✅ Return Confirmation Modal (Desktop) */}
        <Modal
          title={t("borrow.confirmReturnTitle")}
          open={returnModal.open}
          onCancel={() => setReturnModal({ open: false, record: null })}
          onOk={handleConfirmReturn}
          okText={t("common.submit")}
          cancelText={t("common.cancel")}
          centered
          destroyOnClose
        >
          <p>{t("borrow.confirmReturnContent")}</p>
          {returnModal.record && (
             <p><strong>{returnModal.record.title || t("common.unknown")}</strong></p>
          )}
        </Modal>
    </div>
  );
}

export default BorrowPage;
