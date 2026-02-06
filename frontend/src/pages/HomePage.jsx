// ✅ client/src/pages/HomePage.jsx
import { useEffect, useState } from "react";
import { Typography, Row, Col, Button, Skeleton, Space, Badge } from "antd";
import { 
  SearchOutlined, 
  ReadOutlined, 
  ClockCircleOutlined, 
  BulbOutlined,
  RightOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { getRecommendations, getBorrowedBooks } from "../api";
import { useLanguage } from "../contexts/LanguageContext";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const { Title, Text } = Typography;

function HomePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    activeLoans: [],
    recommendations: [],
    dueSoonCount: 0
  });

  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const user = JSON.parse(sessionStorage.getItem("user") || localStorage.getItem("user") || "{}");

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        setLoading(true);
        // Parallel fetch
        const [recRes, borrowRes] = await Promise.allSettled([
          getRecommendations(token),
          getBorrowedBooks(token)
        ]);

        const recommendations = recRes.status === 'fulfilled' ? (recRes.value.data?.recommended || []) : [];
        const activeLoans = borrowRes.status === 'fulfilled' ? (borrowRes.value.data || []) : [];

        // Calculate Due Soon (within 3 days)
        const dueSoon = activeLoans.filter(book => {
          if (!book.dueDate) return false;
          const diff = dayjs(book.dueDate).diff(dayjs(), 'day');
          return diff >= 0 && diff <= 3;
        }).length;

        setData({
          activeLoans,
          recommendations,
          dueSoonCount: dueSoon
        });
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="page-container">
      {/* 1. Hero Section */}
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div>
          <Title level={2} style={{ marginBottom: 4 }}>
            {getGreeting()}, {user.name || "Reader"}
          </Title>
          <Text type="secondary">
            {t("common.welcomeDesc") || "Here is what's happening with your library account today."}
          </Text>
        </div>
        <div>
          <Button 
            type="primary" 
            size="large" 
            icon={<SearchOutlined />} 
            onClick={() => navigate('/search')}
            style={{ paddingLeft: 24, paddingRight: 24 }}
          >
            {t("common.searchBooks")}
          </Button>
        </div>
      </div>

      {/* 2. KPI Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: 40 }}>
        <Col xs={24} sm={12} md={6}>
          <div className="kpi-card" onClick={() => navigate('/borrow')} style={{ cursor: 'pointer' }}>
            <div className="kpi-icon-wrapper" style={{ background: '#e6f7ff', color: '#1890ff' }}>
              <ReadOutlined style={{ fontSize: 20 }} />
            </div>
            <div className="kpi-title">{t("titles.currentBorrowings") || "Active Loans"}</div>
            <div className="kpi-value">
              {loading ? <Skeleton.Button active size="small" /> : data.activeLoans.length}
            </div>
          </div>
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <div className="kpi-card" onClick={() => navigate('/borrow')} style={{ cursor: 'pointer' }}>
            <div className="kpi-icon-wrapper" style={{ background: '#fff7e6', color: '#faad14' }}>
              <ClockCircleOutlined style={{ fontSize: 20 }} />
            </div>
            <div className="kpi-title">{t("titles.borrowLimit") || "Due Soon"}</div>
            <div className="kpi-value">
              {loading ? <Skeleton.Button active size="small" /> : data.dueSoonCount}
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className="kpi-card" onClick={() => navigate('/assistant')} style={{ cursor: 'pointer' }}>
            <div className="kpi-icon-wrapper" style={{ background: '#f9f0ff', color: '#722ed1' }}>
              <BulbOutlined style={{ fontSize: 20 }} />
            </div>
            <div className="kpi-title">{t("common.smartRec") || "For You"}</div>
            <div className="kpi-value">
              {loading ? <Skeleton.Button active size="small" /> : data.recommendations.length}
            </div>
          </div>
        </Col>

         {/* Placeholder for future metric or static info */}
         <Col xs={24} sm={12} md={6}>
          <div className="kpi-card" style={{ background: '#fafafa', borderColor: 'transparent' }}>
             <div className="kpi-title" style={{ marginBottom: 12 }}>Library Status</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Badge status="processing" />
                <Text strong>Open Now</Text>
             </div>
             <Text type="secondary" style={{ fontSize: 12, marginTop: 4 }}>Closes at 9:00 PM</Text>
          </div>
        </Col>
      </Row>

      {/* 3. Trending / Recommendations Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>{t("titles.popularToday")}</Title>
        <Button type="link" onClick={() => navigate('/search')} icon={<RightOutlined />}>
           View All
        </Button>
      </div>

      {loading ? (
        <Row gutter={[24, 24]}>
          {[1, 2, 3, 4].map(i => (
            <Col xs={24} sm={12} md={6} key={i}>
              <div className="card-clean" style={{ height: 300, padding: 20 }}>
                <Skeleton active />
              </div>
            </Col>
          ))}
        </Row>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
          gap: '24px' 
        }}>
          {data.recommendations.slice(0, 5).map(book => (
            <div 
              key={book._id} 
              className="card-clean"
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
              onClick={() => navigate(`/book/${book._id}`)}
            >
              <div style={{ 
                height: 200, 
                background: '#f5f5f5', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                overflow: 'hidden'
              }}>
                {book.cover ? (
                  <img 
                    src={book.cover} 
                    alt={book.title} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                ) : (
                  <div style={{ fontSize: 40, color: '#d9d9d9' }}>📚</div>
                )}
              </div>
              <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={book.title}>
                  {book.title}
                </div>
                <div style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 12 }}>
                  {book.author}
                </div>
                <div style={{ marginTop: 'auto' }}>
                  <span className={`status-tag ${book.stock > 0 ? 'status-success' : 'status-default'}`}>
                    {book.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HomePage;
