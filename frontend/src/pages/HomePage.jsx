import React, { useEffect, useState } from "react";
import { Row, Col, Typography, Button, Skeleton, Space, Card, Statistic, Avatar } from "antd";
import { 
  FireOutlined, 
  ReadOutlined, 
  BookOutlined, 
  ArrowRightOutlined,
  SearchOutlined,
  CompassOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import PageShell from "../components/common/PageShell";
import Section from "../components/common/Section";
import ModernBookCard from "../components/common/ModernBookCard";
import { getBooks, getRecommendations, getBorrowedBooks, getBorrowHistory } from "../api";

const { Title, Text, Paragraph } = Typography;

const HomePage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [trending, setTrending] = useState([]);
  const [activeBorrows, setActiveBorrows] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    active: 0,
    total: 0,
    pending: 0
  });

  useEffect(() => {
    const sessionUser = sessionStorage.getItem("user");
    const localUser = localStorage.getItem("user");
    if (sessionUser || localUser) {
      setUser(JSON.parse(sessionUser || localUser));
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      
      const [allBooksRes, recommendRes, borrowedRes, historyRes] = await Promise.allSettled([
        getBooks(),
        getRecommendations(token),
        getBorrowedBooks(token),
        getBorrowHistory(token)
      ]);

      // Process Recommendations (Mocking "Trending" logic if API returns generic list)
      if (allBooksRes.status === 'fulfilled') {
        const allBooks = allBooksRes.value.data;
        // Simple logic: take first 4 as trending for demo, or shuffle
        setTrending(allBooks.slice(0, 4));
      }

      // Stats
      let activeCount = 0;
      if (borrowedRes.status === 'fulfilled') {
        setActiveBorrows(borrowedRes.value.data);
        activeCount = borrowedRes.value.data.length;
      }
      
      let historyCount = 0;
      if (historyRes.status === 'fulfilled') {
        setHistory(historyRes.value.data.slice(0, 5));
        historyCount = historyRes.value.data.length;
      }

      setStats({
        active: activeCount,
        total: historyCount,
        pending: 0 // Mock pending
      });

    } catch (error) {
      console.error("Error fetching home data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <PageShell 
      noPadding
      breadcrumbItems={[{ title: 'Library' }, { title: 'Home' }]}
    >
      {/* Hero Section */}
      <div style={{
        background: 'linear-gradient(135deg, #E6F7FF 0%, #F0F5FF 100%)',
        borderRadius: 16,
        padding: '40px 32px',
        marginBottom: 32,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Row align="middle" gutter={[24, 24]}>
          <Col xs={24} md={16}>
            <Title level={1} style={{ marginBottom: 16, color: '#003eb3' }}>
              {getGreeting()}, {user.name || 'Reader'}
            </Title>
            <Paragraph style={{ fontSize: 16, color: '#597ef7', maxWidth: 600 }}>
              Explore our vast collection of books, manage your loans, and discover your next favorite read with our smart assistant.
            </Paragraph>
            <Space size="middle" style={{ marginTop: 16 }}>
              <Button type="primary" size="large" icon={<SearchOutlined />} onClick={() => navigate('/search')} shape="round">
                Start Exploring
              </Button>
              <Button size="large" icon={<BookOutlined />} onClick={() => navigate('/borrow')} shape="round">
                My Loans
              </Button>
            </Space>
          </Col>
          <Col xs={0} md={8} style={{ textAlign: 'right' }}>
            <CompassOutlined style={{ fontSize: 120, color: 'rgba(22, 119, 255, 0.1)' }} />
          </Col>
        </Row>
      </div>

      {/* Stats Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: 40 }}>
        <Col xs={12} sm={6}>
          <Card bordered={false} hoverable>
            <Statistic 
              title="Active Loans" 
              value={stats.active} 
              prefix={<BookOutlined style={{ color: '#1677FF' }} />} 
              valueStyle={{ color: '#1677FF', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} hoverable>
            <Statistic 
              title="Pending Requests" 
              value={stats.pending} 
              prefix={<HistoryOutlined style={{ color: '#FAAD14' }} />} 
              valueStyle={{ fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} hoverable>
            <Statistic 
              title="Total Read" 
              value={stats.total} 
              prefix={<ReadOutlined style={{ color: '#52C41A' }} />} 
              valueStyle={{ fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card bordered={false} hoverable onClick={() => navigate('/assistant')} style={{ cursor: 'pointer', background: '#F9F0FF' }}>
            <Statistic 
              title="Smart Assistant" 
              value="Ask AI" 
              prefix={<FireOutlined style={{ color: '#722ED1' }} />} 
              valueStyle={{ color: '#722ED1', fontSize: 20 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Trending Books */}
      <Section 
        title="Trending Now" 
        onViewAll={() => navigate('/search')}
        extra={<Tag color="volcano">Hot</Tag>}
      >
        {loading ? (
          <Row gutter={[16, 16]}>
            {[1, 2, 3, 4].map(i => (
              <Col key={i} xs={24} sm={12} md={6}>
                <Skeleton active />
              </Col>
            ))}
          </Row>
        ) : (
          <Row gutter={[24, 24]}>
            {trending.map(book => (
              <Col key={book._id || book.id} xs={24} sm={12} md={6}>
                <ModernBookCard 
                  book={book} 
                  onBorrow={() => navigate(`/book/${book._id || book.id}`)}
                />
              </Col>
            ))}
          </Row>
        )}
      </Section>

      {/* Recent Activity Section */}
      <Row gutter={[24, 24]}>
        <Col xs={24} md={12}>
           <Section title="Recent Activity">
             <Card bordered={false}>
               {history.length > 0 ? (
                 <Space direction="vertical" style={{ width: '100%' }} size={16}>
                   {history.map((item, idx) => (
                     <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid #f0f0f0' }}>
                       <Space>
                         <Avatar icon={<ReadOutlined />} style={{ backgroundColor: '#E6F7FF', color: '#1677FF' }} />
                         <div>
                           <Text strong style={{ display: 'block' }}>{item.title || item.bookTitle}</Text>
                           <Text type="secondary" style={{ fontSize: 12 }}>{new Date(item.date).toLocaleDateString()}</Text>
                         </div>
                       </Space>
                       <Tag color={item.action === 'return' ? 'green' : 'blue'}>
                         {item.action === 'return' ? 'Returned' : 'Borrowed'}
                       </Tag>
                     </div>
                   ))}
                 </Space>
               ) : (
                 <div style={{ textAlign: 'center', padding: 20 }}>
                   <Text type="secondary">No recent activity found.</Text>
                   <br/>
                   <Button type="link" onClick={() => navigate('/search')}>Start Reading</Button>
                 </div>
               )}
             </Card>
           </Section>
        </Col>
        
        <Col xs={24} md={12}>
           <Section title="New Arrivals">
             <div style={{ 
               background: '#FFF7E6', 
               padding: 24, 
               borderRadius: 16, 
               height: '100%',
               display: 'flex',
               flexDirection: 'column',
               justifyContent: 'center',
               alignItems: 'center',
               textAlign: 'center'
             }}>
                <FireOutlined style={{ fontSize: 40, color: '#FAAD14', marginBottom: 16 }} />
                <Title level={4}>Discover New Books</Title>
                <Paragraph type="secondary">We update our collection every week. Check out what's new in the library.</Paragraph>
                <Button type="primary" ghost style={{ borderColor: '#FAAD14', color: '#FAAD14' }} onClick={() => navigate('/search?sort=newest')}>
                  Browse New Arrivals
                </Button>
             </div>
           </Section>
        </Col>
      </Row>

    </PageShell>
  );
};

// Missing imports fix
import { HistoryOutlined } from "@ant-design/icons";
import { Tag } from "antd";

export default HomePage;
