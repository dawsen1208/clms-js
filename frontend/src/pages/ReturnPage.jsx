// ✅ client/src/pages/ReturnPage.jsx
import { useEffect, useState, useMemo } from "react";
import { List, Card, Button, Spin, Modal, message, Tag, Typography, Statistic, Empty } from "antd";
import {
  RollbackOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import "./ReturnPage.css";
const { Title, Text } = Typography;
import {
  getBorrowedBooksLibrary,
  requestReturnLibrary,
  getUserRequestsLibrary,
} from "../api.js";
import { useLanguage } from "../contexts/LanguageContext";

function ReturnPage() {
  const { t } = useLanguage();
  const [borrowed, setBorrowed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [returnModal, setReturnModal] = useState({ open: false, record: null });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [localPendingReturn, setLocalPendingReturn] = useState([]); // ✅ 本地乐观 Pending 列表
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  const stats = useMemo(() => {
    const total = borrowed.length;
    const pending = pendingRequests.filter((r) => r.type === "return" && r.status === "pending").length;
    const approved = pendingRequests.filter((r) => r.type === "return" && r.status === "approved").length;
    const rejected = pendingRequests.filter((r) => r.type === "return" && r.status === "rejected").length;
    return { total, pending, approved, rejected };
  }, [borrowed, pendingRequests]);

  /* =========================================================
     🏷️ 最近一次归还申请状态（用于行内 Tag 展示）
     ========================================================= */
  const getLatestRequestStatus = (bookId) => {
    const idStr = String(bookId);
    // 本地乐观优先：只要在本地 Pending 列表中，则显示 Pending
    if (localPendingReturn.includes(idStr)) return "pending";

    // 查找该书最近一次归还申请（后端按 updatedAt DESC 返回最多5条）
    const req = pendingRequests.find(
      (r) => String(r.bookId) === idStr && r.type === "return"
    );
    return req?.status || null;
  };

  const renderStatusTag = (bookId) => {
    const status = getLatestRequestStatus(bookId);
    if (!status) return null;
    const colorMap = { pending: "gold", approved: "green", rejected: "red" };
    const text = t("common." + status) || status;
    return (
      <Tag color={colorMap[status] || "default"} style={{ marginLeft: 8 }}>
        {text}
      </Tag>
    );
  };

  /* =========================================================
     📘 获取当前借阅记录 + 用户申请状态
     ========================================================= */
  const fetchBorrowedBooks = async () => {
    if (!token) {
      message.warning(t("common.loginFirst"));
      return;
    }

    try {
      setLoading(true);
      const [resBorrowed, resRequests] = await Promise.all([
        getBorrowedBooksLibrary(token),
        getUserRequestsLibrary(token),
      ]);

      const unreturned = (resBorrowed.data || []).filter((r) => !r.returned);
      setBorrowed(unreturned);
      setPendingRequests(resRequests.data || []);

      console.log("📚 未归还书籍:", unreturned);
      console.log("📨 当前用户申请:", resRequests.data);
    } catch (err) {
      console.error("❌ Failed to fetch borrow list:", err);
      message.error(t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     🔁 打开归还申请弹窗
     ========================================================= */
  const openReturnModal = (record) => {
    setReturnModal({ open: true, record });
  };

  /* =========================================================
     📨 提交归还申请
     ========================================================= */
  const handleConfirmReturn = async () => {
    const record = returnModal.record;
    if (!record) return message.warning(t("return.bookNotFound"));

    // ✅ 统一 bookId 类型
    const bookId =
      typeof record.bookId === "object"
        ? record.bookId._id
        : record.bookId || record._id;

    if (!bookId) return message.error(t("return.invalidBookId"));

    // ✅ 立即设置本地 Pending，按钮立刻禁用并显示 Pending
    const idStr = String(bookId);
    setLocalPendingReturn((prev) => (prev.includes(idStr) ? prev : [...prev, idStr]));

    try {
      await requestReturnLibrary(
        {
          type: "return",
          bookId: record.bookId?._id || record.bookId || record._id,
          bookTitle: record.title || record.bookTitle,
        },
        token
      );


      // ✅ Correct: message.success
      message.success(t("return.requestSubmitted"));

      setReturnModal({ open: false, record: null });
      fetchBorrowedBooks(); // ✅ 即时刷新（同步后端 Pending）
    } catch (err) {
      console.error("❌ Return request failed:", err);
      const msg = err.response?.data?.message || t("return.requestFailed");
      message.error(msg);
      // ❌ 提交失败则移除本地 Pending
      setLocalPendingReturn((prev) => prev.filter((x) => x !== idStr));
    }
  };

  /* =========================================================
     🔒 判断该书是否存在任一待处理申请（续借或归还）
     ========================================================= */
  const isPendingAny = (bookId) =>
    pendingRequests.some(
      (r) => String(r.bookId) === String(bookId) && r.status === "pending"
    );
  const isPendingReturnUI = (bookId) => {
    const idStr = String(bookId);
    // 本页的本地乐观归还 Pending 或后端任一 Pending（续借/归还）均禁用
    return localPendingReturn.includes(idStr) || isPendingAny(idStr);
  };

  /* =========================================================
     🚀 页面初始化加载（已去除定时刷新）
     ========================================================= */
  useEffect(() => {
    fetchBorrowedBooks();
  }, []);

  /* =========================================================
     🧱 页面渲染
     ========================================================= */
  return (
    <div className="return-page" style={{ padding: "1.5rem" }}>
      <Card
        title={
          <div className="page-header">
            <Title level={2} className="page-modern-title" style={{ margin: 0 }}>{t("titles.myReturnRequests")}</Title>
            <Text type="secondary">{t("common.returnSystem")}</Text>
            <div className="stats-grid">
              <Statistic title={t("common.total")} value={stats.total} />
              <Statistic title={t("common.pending")} value={stats.pending} valueStyle={{ color: "#faad14" }} />
              <Statistic title={t("common.approved")} value={stats.approved} valueStyle={{ color: "#52c41a" }} />
              <Statistic title={t("common.rejected")} value={stats.rejected} valueStyle={{ color: "#ff4d4f" }} />
            </div>
          </div>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchBorrowedBooks}
            style={{
              borderRadius: 6,
              background: "linear-gradient(90deg,#36cfc9,#1890ff)",
              color: "#fff",
            }}
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
              const pending = isPendingReturnUI(bookIdNormalized);
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
                        {t("common.pending")}
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        danger
                        icon={<RollbackOutlined />}
                        style={{
                          borderRadius: 6,
                          fontWeight: "bold",
                        }}
                        onClick={() => openReturnModal(record)}
                      >
                        {t("borrow.requestReturn")}
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
                              {record.title || record.bookTitle || t("profile.unknownBook")}
                            </Link>
                          ) : (
                            <span style={{ color: "#333", fontWeight: 600 }}>
                              {record.title || record.bookTitle || t("profile.unknownBook")}
                            </span>
                          )}
                          {renderStatusTag(bookIdNormalized)}
                        </>
                      )
                    }
                    description={`📅 ${t("return.borrowedAt")} ${
                      record.borrowDate
                        ? dayjs(record.borrowDate).format("YYYY-MM-DD")
                        : t("common.unknown")
                    }`}
                  />
                </List.Item>
              );
            }}
          />
        ) : (
          <Empty description={t("return.noBooks")} />
        )}
      </Card>

      <Modal
        title={t("return.confirmTitle")}
        open={returnModal.open}
        onCancel={() => setReturnModal({ open: false, record: null })}
        onOk={handleConfirmReturn}
        okText={t("return.submitRequest")}
        cancelText={t("common.cancel")}
        centered
        destroyOnClose
      >
        <p style={{ fontSize: "1rem" }}>
          {t("return.confirmContent")}
          <b>
            “
            {returnModal.record?.title ||
              returnModal.record?.bookTitle ||
              t("profile.unknownBook")}
            ”</b>
          {t("return.confirmSuffix")}
        </p>
        <p style={{ color: "#888", marginTop: 8 }}>
          {t("return.adminApprovalNote")}
        </p>
      </Modal>
    </div>
  );
}

export default ReturnPage;
