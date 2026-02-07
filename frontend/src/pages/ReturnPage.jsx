import React, { useEffect, useState, useMemo } from "react";
import { List, Button, message, Tag, Typography, Space, theme, Card, Spin, Empty, Avatar } from "antd";
import { ReloadOutlined, ClockCircleOutlined, BookOutlined, CheckCircleOutlined, HistoryOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { Link } from "react-router-dom";
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";
import KPIStatCard from "../components/common/KPIStatCard";
import { getBorrowHistory } from "../api";
import { useLanguage } from "../contexts/LanguageContext";

const { Text } = Typography;

function ReturnPage() {
  const { t } = useLanguage();
  const { token } = theme.useToken();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const userToken = sessionStorage.getItem("token") || localStorage.getItem("token");

  const stats = useMemo(() => {
    const total = history.length;
    const returned = history.filter(r => r.action === 'return').length;
    return { total, returned };
  }, [history]);

  const fetchHistory = async () => {
    if (!userToken) {
      message.warning(t("common.loginFirst"));
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

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title={t("nav.borrowHistory") || "借阅记录"}
        subtitle={t("history.subtitle") || "View your borrowing and returning activity."}
        icon={<HistoryOutlined />}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchHistory}
            type="primary"
          >
            {t("common.refresh")}
          </Button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
         <KPIStatCard 
           title="Total Activities" 
           value={stats.total} 
           icon={<BookOutlined/>} 
           color={token.colorPrimary} 
         />
         <KPIStatCard 
           title="Books Returned" 
           value={stats.returned} 
           icon={<CheckCircleOutlined/>} 
           color={token.colorSuccess} 
         />
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <Spin size="large" />
        </div>
      ) : history.length > 0 ? (
        <List
          grid={{ gutter: 16, xs: 1, sm: 1, md: 2, lg: 3, xl: 3, xxl: 4 }}
          dataSource={history}
          renderItem={(item) => {
            const isReturn = item.action === 'return';
            const color = isReturn ? token.colorSuccess : token.colorPrimary;
            const icon = isReturn ? <CheckCircleOutlined /> : <BookOutlined />;
            
            return (
              <List.Item>
                <Card
                  hoverable
                  bordered={false}
                  style={{ borderRadius: token.borderRadiusLG, height: '100%', boxShadow: token.boxShadowTertiary }}
                  bodyStyle={{ padding: '20px' }}
                >
                    <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                        <Avatar 
                            icon={icon} 
                            style={{ backgroundColor: color, marginRight: 16 }} 
                            size="large"
                        />
                        <div style={{ flex: 1 }}>
                             <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 4 }}>
                                {item.title || "Unknown Book"}
                             </Text>
                             <div style={{ marginBottom: 8 }}>
                                <Tag color={isReturn ? "green" : "blue"}>
                                    {isReturn ? "Returned" : "Borrowed"}
                                </Tag>
                             </div>
                             <Text type="secondary" style={{ fontSize: 13 }}>
                                {dayjs(item.date).format("YYYY-MM-DD HH:mm")}
                             </Text>
                        </div>
                    </div>
                </Card>
              </List.Item>
            );
          }}
        />
      ) : (
        <Empty description="No history found" />
      )}
    </PageContainer>
  );
}

export default ReturnPage;
