// ✅ client/src/pages/ReturnPage.jsx
import { useEffect, useState, useMemo } from "react";
import { List, Card, Button, Spin, Modal, message, Tag,
  Typography,
  Statistic,
  Empty,
  Space
} from "antd";
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
  // requestReturnLibrary, // ❌ Removed
  // getUserRequestsLibrary, // ❌ Removed
} from "../api.js";
import { useLanguage } from "../contexts/LanguageContext";

function ReturnPage() {
  const { t } = useLanguage();
  const [borrowed, setBorrowed] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  const stats = useMemo(() => {
    const total = borrowed.length;
    const overdue = borrowed.filter(r => dayjs(r.dueDate).isBefore(dayjs())).length;
    return { total, overdue };
  }, [borrowed]);

  /* =========================================================
     📘 获取当前借阅记录
     ========================================================= */
  const fetchBorrowedBooks = async () => {
    if (!token) {
      message.warning(t("common.loginFirst"));
      return;
    }

    try {
      setLoading(true);
      const resBorrowed = await getBorrowedBooksLibrary(token);
      
      const unreturned = (resBorrowed.data || []).filter((r) => !r.returned);
      setBorrowed(unreturned);
      
      console.log("📚 未归还书籍:", unreturned);
    } catch (err) {
      console.error("❌ Failed to fetch borrow list:", err);
      message.error(t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     🚀 页面初始化加载
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
            <Title level={2} className="page-modern-title" style={{ margin: 0 }}>{t("titles.myReturnRequests") || t("common.returnSystem")}</Title>
            <Text type="secondary">{t("return.adminApprovalNote") || "Please return books to the library desk."}</Text>
            <div className="stats-grid">
              <Statistic title={t("common.total")} value={stats.total} />
              <Statistic title={t("profile.overdueDays", { days: "" }).replace(/\d+/, "").trim() || "Overdue"} value={stats.overdue} valueStyle={{ color: stats.overdue > 0 ? "#ff4d4f" : "#52c41a" }} />
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
              const bookIdForLink = bookIdNormalized || null;
              const isOverdue = dayjs(record.dueDate).isBefore(dayjs());

              return (
                <List.Item
                  actions={[
                    <Tag color={isOverdue ? "red" : "green"} style={{ fontSize: "14px", padding: "4px 10px" }}>
                       {isOverdue ? (t("common.overdue") || "Overdue") : (t("common.borrowed") || "Borrowed")}
                    </Tag>
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
                        </>
                      )
                    }
                    description={
                        <Space direction="vertical" size={2}>
                            <span>
                                📅 {t("return.borrowedAt")} {record.borrowDate ? dayjs(record.borrowDate).format("YYYY-MM-DD") : t("common.unknown")}
                            </span>
                            <span style={{ color: isOverdue ? "#ff4d4f" : "#52c41a" }}>
                                ⏰ {t("borrow.dueDate")}: {record.dueDate ? dayjs(record.dueDate).format("YYYY-MM-DD") : t("common.unknown")}
                            </span>
                        </Space>
                    }
                  />
                </List.Item>
              );
            }}
          />
        ) : (
          <Empty description={t("return.noBooks")} />
        )}
      </Card>
    </div>
  );
}

export default ReturnPage;
