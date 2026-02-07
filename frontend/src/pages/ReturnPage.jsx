import React, { useEffect, useState, useMemo } from "react";
import { List, Button, message, Tag, Typography, Space, theme, Card, Spin, Empty } from "antd";
import { ReloadOutlined, ClockCircleOutlined, BookOutlined, CheckCircleOutlined, SyncOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";
import KPIStatCard from "../components/common/KPIStatCard";
import { getBorrowedBooksLibrary } from "../api.js";
import { useLanguage } from "../contexts/LanguageContext";

const { Text } = Typography;

function ReturnPage() {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [borrowed, setBorrowed] = useState([]);
  const [loading, setLoading] = useState(false);
  const userToken = sessionStorage.getItem("token") || localStorage.getItem("token");

  const stats = useMemo(() => {
    const total = borrowed.length;
    const overdue = borrowed.filter(r => dayjs(r.dueDate).isBefore(dayjs())).length;
    return { total, overdue };
  }, [borrowed]);

  const fetchBorrowedBooks = async () => {
    if (!userToken) {
      message.warning(t("common.loginFirst"));
      return;
    }

    try {
      setLoading(true);
      const resBorrowed = await getBorrowedBooksLibrary(userToken);
      const unreturned = (resBorrowed.data || []).filter((r) => !r.returned);
      setBorrowed(unreturned);
      console.log("📚 Unreturned books:", unreturned);
    } catch (err) {
      console.error("❌ Failed to fetch borrow list:", err);
      message.error(t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowedBooks();
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title={t("titles.myReturnRequests") || t("common.returnSystem")}
        subtitle={t("return.adminApprovalNote") || "Please return books to the library desk."}
        icon={<ReloadOutlined spin={loading} />}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchBorrowedBooks}
            type="primary"
          >
            {t("common.refresh")}
          </Button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
         <KPIStatCard 
           title={t("common.total")} 
           value={stats.total} 
           icon={<BookOutlined/>} 
           color={token.colorPrimary} 
         />
         <KPIStatCard 
           title={t("common.overdue") || "Overdue"} 
           value={stats.overdue} 
           icon={<ClockCircleOutlined/>} 
           color={stats.overdue > 0 ? token.colorError : token.colorSuccess} 
         />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Spin size="large" />
        </div>
      ) : borrowed.length > 0 ? (
        <List
          grid={{ gutter: 16, xs: 1, sm: 2, md: 3, lg: 4, xl: 4, xxl: 4 }}
          dataSource={borrowed}
          renderItem={(record) => {
            const bookIdNormalized = typeof record.bookId === "object" ? record.bookId?._id : record.bookId;
            const bookIdForLink = bookIdNormalized || null;
            const isOverdue = dayjs(record.dueDate).isBefore(dayjs());
            const title = record.title || record.bookTitle || t("profile.unknownBook");

            return (
              <List.Item>
                <Card
                  hoverable
                  bordered={false}
                  style={{ borderRadius: token.borderRadiusLG, height: '100%', boxShadow: token.boxShadowTertiary }}
                  bodyStyle={{ padding: '16px', display: 'flex', flexDirection: 'column', height: '100%' }}
                >
                    <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, marginRight: 8 }}>
                             <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 4, lineHeight: 1.4 }}>
                                {bookIdForLink ? (
                                    <Link to={`/book/${bookIdForLink}`} style={{ color: token.colorTextHeading }}>
                                        {title}
                                    </Link>
                                ) : title}
                             </Text>
                             <Tag color={isOverdue ? "red" : "green"}>
                                {isOverdue ? (t("common.overdue") || "Overdue") : (t("common.borrowed") || "Borrowed")}
                             </Tag>
                        </div>
                        <div style={{ fontSize: 24, color: isOverdue ? token.colorError : token.colorSuccess, opacity: 0.2 }}>
                            <BookOutlined />
                        </div>
                    </div>
                    
                    <div style={{ marginTop: 'auto' }}>
                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                                📅 {t("return.borrowedAt")}: {record.borrowDate ? dayjs(record.borrowDate).format("YYYY-MM-DD") : t("common.unknown")}
                            </Text>
                            <Text type={isOverdue ? "danger" : "secondary"} style={{ fontSize: 13 }}>
                                ⏰ {t("borrow.dueDate")}: {record.dueDate ? dayjs(record.dueDate).format("YYYY-MM-DD") : t("common.unknown")}
                            </Text>
                        </Space>
                    </div>
                </Card>
              </List.Item>
            );
          }}
        />
      ) : (
        <Empty description={t("return.noBooks")} />
      )}
    </PageContainer>
  );
}

export default ReturnPage;
