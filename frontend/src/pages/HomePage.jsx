import React, { useEffect, useState } from "react";
import { Row, Col, Typography, Button, Carousel, List, Tag, Skeleton, Avatar, Space } from "antd";
import { 
  FireOutlined, 
  ReadOutlined, 
  HistoryOutlined, 
  RightOutlined,
  BookOutlined,
  UserOutlined,
  CalendarOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";
import KPIStatCard from "../components/common/KPIStatCard";
import ModernBookCard from "../components/common/ModernBookCard";
import { getBooks, getRecommendations, getBorrowedBooks, getBorrowHistory } from "../api";

const { Title, Text, Paragraph } = Typography;

const HomePage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [books, setBooks] = useState([]);
  const [trending, setTrending] = useState([]);
  const [activeBorrows, setActiveBorrows] = useState([]);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({
    active: 0,
    total: 0,
    overdue: 0
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
      
      // Parallel fetching
      const [allBooksRes, recommendRes, borrowedRes, historyRes] = await Promise.allSettled([
        getBooks(),
        getRecommendations(token),
        getBorrowedBooks(token),
        getBorrowHistory(token)
      ]);

      // Process Books & Recommendations
      let recommendedBooks = [];
      
      if (allBooksRes.status === 'fulfilled') {
        const allBooks = allBooksRes.value.data;
        const targetTitles = [
          "sapiens", 
          "clean code", 
          "the intelligent investor", 
          "atomic habits"
        ];
        
        // Filter for specific books
        recommendedBooks = allBooks.filter(b => 
          targetTitles.some(t => b.title.toLowerCase().includes(t))
        );
        
        // Enforce specific covers and ensure order if needed (optional)
        recommendedBooks = recommendedBooks.map(b => {
             let cover = b.coverUrl;
             const lowerTitle = b.title.toLowerCase();
             if (lowerTitle.includes("sapiens")) cover = "/books/sapiens.jpg";
             else if (lowerTitle.includes("clean code")) cover = "/books/cleancode.jpg";
             else if (lowerTitle.includes("investor")) cover = "/books/investor.jpg";
             else if (lowerTitle.includes("atomic habits")) cover = "/books/habits.jpg";
             return { ...b, coverUrl: cover };
        });

        // If we found fewer than 4, fallback or keep as is.
        // If we found more (duplicates), slice.
        recommendedBooks = recommendedBooks.slice(0, 4);
      }

      setTrending(recommendedBooks);


      // Process Active Borrows
      let currentActive = 0;
      if (borrowedRes.status === 'fulfilled') {
        setActiveBorrows(borrowedRes.value.data);
        currentActive = borrowedRes.value.data.length;
      }

      // Process History
      let totalRead = 0;
      if (historyRes.status === 'fulfilled') {
        setHistory(historyRes.value.data.slice(0, 5)); // Last 5
        totalRead = historyRes.value.data.length;
      }

      setStats({
        active: currentActive,
        total: totalRead,
        overdue: 0 // Mock for now, logic needs due date calc
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
    <PageContainer>
      <PageHeader 
        title={`${getGreeting()}, ${user.name || 'Reader'}!`}
        subtitle="Welcome back to your digital library."
        extra={
          <Button type="primary" size="large" onClick={() => navigate('/search')}>
            Browse Library
          </Button>
        }
      />

      {/* Stats Row */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={8}>
          <KPIStatCard 
            title="Active Loans" 
            value={stats.active} 
            icon={<BookOutlined />} 
            color="#1890ff"
            loading={loading}
            suffix="books"
          />
        </Col>
        <Col xs={24} sm={8}>
          <KPIStatCard 
            title="Total Read" 
            value={stats.total} 
            icon={<ReadOutlined />} 
            color="#52c41a"
            trend="up"
            trendValue="12%"
            loading={loading}
          />
        </Col>
        <Col xs={24} sm={8}>
          <KPIStatCard 
            title="Recommended" 
            value={trending.length} 
            icon={<FireOutlined />} 
            color="#ff4d4f"
            loading={loading}
            suffix="new picks"
          />
        </Col>
      </Row>

      <Row gutter={[32, 32]}>
        {/* Left Column: Main Content */}
        <Col xs={24} lg={16}>
          {/* Trending / Recommended Section */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Title level={3} style={{ margin: 0 }}>
                <FireOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                Recommended for You
              </Title>
              <Button type="link" onClick={() => navigate('/search')}>View All <RightOutlined /></Button>
            </div>
            
            {loading ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : (
              <div className="trending-scroll-container">
                 {trending.length > 0 ? (
                   <Row gutter={[16, 16]}>
                     {trending.map(book => (
                       <Col xs={12} sm={8} md={6} key={book._id || book.id}>
                         <ModernBookCard book={book} onBorrow={() => navigate(`/book/${book._id || book.id}`)} />
                       </Col>
                     ))}
                   </Row>
                 ) : (
                   <Text type="secondary">No recommendations available.</Text>
                 )}
              </div>
            )}
          </div>
        </Col>

        {/* Right Column: Sidebar Info */}
        <Col xs={24} lg={8}>
          {/* Quick Actions Card */}
          <div className="card-shadow" style={{ background: '#fff', borderRadius: 14, padding: 24, marginBottom: 24 }}>
             <Title level={4} style={{ marginTop: 0 }}>Quick Actions</Title>
             <Space direction="vertical" style={{ width: '100%' }} size={12}>
               <Button block icon={<BookOutlined />} onClick={() => navigate('/borrow')} style={{ textAlign: 'left', height: 44 }}>
                 Manage My Loans
               </Button>
               <Button block icon={<HistoryOutlined />} onClick={() => navigate('/return')} style={{ textAlign: 'left', height: 44 }}>
                 Return Books
               </Button>
               <Button block icon={<UserOutlined />} onClick={() => navigate('/profile')} style={{ textAlign: 'left', height: 44 }}>
                 Update Profile
               </Button>
             </Space>
          </div>

          {/* Recent Activity */}
          <div className="card-shadow" style={{ background: '#fff', borderRadius: 14, padding: 24 }}>
            <Title level={4} style={{ marginTop: 0 }}>Recent Activity</Title>
            <List
              loading={loading}
              itemLayout="horizontal"
              dataSource={history}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={
                       <Avatar 
                         icon={<BookOutlined />} 
                         style={{ backgroundColor: item.action === 'return' ? '#52c41a' : '#1890ff' }} 
                       />
                    }
                    title={<Text strong>{item.bookTitle}</Text>}
                    description={
                      <Space direction="vertical" size={0}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                           {item.action === 'borrow' ? 'Borrowed' : 'Returned'} on {new Date(item.date).toLocaleDateString()}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
            {history.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Text type="secondary">No recent activity</Text>
              </div>
            )}
          </div>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default HomePage;
