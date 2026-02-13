import React, { useEffect, useState, useMemo } from "react";
import { List, Button, message, Tag, Typography, theme, Card, Spin, Empty, Avatar, Row, Col, Space } from "antd";
import { ReloadOutlined, ClockCircleOutlined, BookOutlined, CheckCircleOutlined, HistoryOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Link, useNavigate } from "react-router-dom";
import PageShell from "../components/common/PageShell";
import Section from "../components/common/Section";
import KPIStatCard from "../components/common/KPIStatCard";
import EmptyState from "../components/common/EmptyState";
import { getBorrowHistory } from "../api";
import { useLanguage } from "../contexts/LanguageContext";

const { Text, Title } = Typography;

function ReturnPage() {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const userToken = sessionStorage.getItem("token") || localStorage.getItem("token");

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    if (!userToken) {
      // message.warning(t("common.loginFirst")); // handled by shell usually or redirect
      return;
    }

    try {
      setLoading(true);
      const res = await getBorrowHistory(userToken);
      setHistory(res.data || []);
    } catch (err) {
      console.error("❌ Failed to fetch history:", err);
      message.error(t("common.failedToLoad"));
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = history.length;
    const returned = history.filter(r => r.action === 'return' || !!r.returnDate).length;
    return { total, returned };
  }, [history]);

  return (
    <PageShell
      title={t("nav.borrowHistory") || "Borrow History"}
      subtitle={t("history.subtitle") || "View your borrowing and returning activity."}
      breadcrumbItems={[
        { title: t("nav.home"), path: "/" },
        { title: t("nav.borrowHistory") }
      ]}
      extra={
        <Button
          icon={<ReloadOutlined />}
          onClick={fetchHistory}
          loading={loading}
        >
          {t("common.refresh")}
        </Button>
      }
    >
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
         <Col xs={24} sm={12}>
           <KPIStatCard 
             title={t("history.totalActivities")} 
             value={stats.total} 
             icon={<BookOutlined/>} 
             color={token.colorPrimary} 
             loading={loading}
           />
         </Col>
         <Col xs={24} sm={12}>
           <KPIStatCard 
             title={t("history.booksReturned")} 
             value={stats.returned} 
             icon={<CheckCircleOutlined/>} 
             color={token.colorSuccess} 
             loading={loading}
           />
         </Col>
      </Row>

      <Section title="Activity Log">
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Spin size="large" />
          </div>
        ) : history.length > 0 ? (
          <List
            grid={{ gutter: 24, xs: 1, sm: 1, md: 2, lg: 3, xl: 3, xxl: 4 }}
            dataSource={history}
            renderItem={(item) => {
              const isReturn = item.action === 'return' || !!item.returnDate;
              const color = isReturn ? token.colorSuccess : token.colorPrimary;
              const icon = isReturn ? <CheckCircleOutlined /> : <BookOutlined />;
              const date = item.date || item.createdAt;
              
              return (
                <List.Item>
                  <Card
                    hoverable
                    bordered={false}
                    style={{ 
                      borderRadius: token.borderRadiusLG, 
                      height: '100%', 
                      boxShadow: token.boxShadowTertiary 
                    }}
                    bodyStyle={{ padding: '24px' }}
                    onClick={() => navigate(`/book/${item.bookId || item.book?._id}`)}
                  >
                      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                          <Avatar 
                              icon={icon} 
                              style={{ backgroundColor: color, marginRight: 16 }} 
                              size="large"
                              shape="square"
                          />
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                               <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }} ellipsis>
                                  {item.title || item.bookTitle || "Unknown Book"}
                               </Text>
                               <div style={{ marginBottom: 8 }}>
                                  <Tag color={isReturn ? "green" : "blue"} style={{ border: 'none' }}>
                                      {isReturn ? t("history.returned") : t("history.borrowing")}
                                  </Tag>
                               </div>
                               <Text type="secondary" style={{ fontSize: 13 }}>
                                  {date ? dayjs(date).format("YYYY-MM-DD HH:mm") : "N/A"}
                               </Text>
                          </div>
                      </div>
                  </Card>
                </List.Item>
              );
            }}
          />
        ) : (
          <EmptyState 
            title="No History" 
            description="Your borrowing history will appear here once you start reading." 
            icon={<HistoryOutlined style={{ fontSize: 48, color: token.colorTextQuaternary }} />}
          />
        )}
      </Section>
    </PageShell>
  );
}

export default ReturnPage;
