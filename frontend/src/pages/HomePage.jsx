import React, { useEffect, useState } from "react";
import { Typography, Button, Skeleton, Space, Card, Grid, theme, Badge } from "antd";
import { 
  ArrowRightOutlined,
  CompassOutlined,
  ReadOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import EditorialPageShell from "../components/common/EditorialPageShell";
import HeroEditorial from "../components/common/HeroEditorial";
import MagazineBentoGrid from "../components/common/MagazineBentoGrid";
import EditorialSectionHeader from "../components/common/EditorialSectionHeader";
import BookCoverPro from "../components/common/BookCoverPro";
import StatCard from "../components/cards/StatCard";
import { getBooks, getRecommendations, getBorrowedBooks, getBorrowHistory } from "../api";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { useToken } = theme;

const HomePage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { token } = useToken();
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [trending, setTrending] = useState([]);
  const [activeBorrows, setActiveBorrows] = useState([]);
  const [stats, setStats] = useState({
    active: 0,
    total: 0,
    pending: 0
  });

  const isMobile = !screens.md;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("user") || localStorage.getItem("user");
      if (raw) {
        setUser(JSON.parse(raw));
      }
    } catch {
      // ignore parse error and keep default user
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

      // Process Recommendations
      if (allBooksRes.status === 'fulfilled') {
        const allBooks = allBooksRes.value.data;
        // TODO: Replace with real trending algorithm
        // Mock Data: Shuffling for demo purposes
        setTrending(allBooks.slice(0, 5));
      } else {
        // TODO: Mock Data Fallback if API fails
        setTrending([
          { id: 'mock1', title: 'The Design of Everyday Things', author: 'Don Norman', category: 'Design', total_copies: 5, available_copies: 2 },
          { id: 'mock2', title: 'Refactoring UI', author: 'Adam Wathan', category: 'Design', total_copies: 3, available_copies: 1 },
          { id: 'mock3', title: 'Clean Code', author: 'Robert C. Martin', category: 'Tech', total_copies: 8, available_copies: 5 },
          { id: 'mock4', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', category: 'Psychology', total_copies: 4, available_copies: 0 },
          { id: 'mock5', title: 'Zero to One', author: 'Peter Thiel', category: 'Business', total_copies: 6, available_copies: 6 },
        ]);
      }

      // Stats
      let activeCount = 0;
      if (borrowedRes.status === 'fulfilled') {
        const borrowed = borrowedRes.value.data || [];
        setActiveBorrows(borrowed);
        activeCount = borrowed.length;
      } else {
        // TODO: Mock Data for development
        activeCount = 3; 
      }
      
      let historyCount = 0;
      if (historyRes.status === 'fulfilled') {
        const hist = historyRes.value.data || [];
        historyCount = hist.length;
      } else {
        // TODO: Mock Data for development
        historyCount = 12;
      }

      setStats({
        active: activeCount,
        total: historyCount,
        pending: 0 // TODO: Implement pending requests count
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

  // Curated Popular List (static)
  const popularList = [
    {
      id: 'clean-code',
      title: 'Clean Code',
      author: 'Robert C. Martin',
      category: 'Technology',
      cover_image: '/books/cleancode.jpg'
    },
    {
      id: 'atomic-habits',
      title: 'Atomic Habits',
      author: 'James Clear',
      category: 'Self-Help',
      cover_image: '/books/habits.jpg'
    },
    {
      id: 'intelligent-investor',
      title: 'The Intelligent Investor',
      author: 'Benjamin Graham',
      category: 'Business',
      cover_image: '/books/investor.jpg'
    },
    {
      id: 'sapiens',
      title: 'Sapiens',
      author: 'Yuval Noah Harari',
      category: 'History',
      cover_image: '/books/sapiens.jpg'
    }
  ];

  // Transform books for Bento Grid (use Popular List)
  const bentoItems = popularList.map((book, index) => ({
    id: book.id,
    title: book.title,
    description: book.author,
    category: book.category,
    meta: 'Popular',
    coverImage: book.cover_image,
    coverNode: !book.cover_image ? (
      <BookCoverPro 
        title={book.title} 
        author={book.author} 
        width={160} 
        height={220} 
        style={index % 2 === 0 ? "swiss" : "serif"}
        baseColor={token.colorPrimary}
      />
    ) : null,
    action: (
      <Button 
        shape="circle" 
        icon={<ArrowRightOutlined />} 
        onClick={() => navigate(`/book/${book.id}`)}
      />
    ),
    // Layout logic: First item big (2x2), next two wide (2x1), rest small (1x1)
    colSpan: isMobile ? 12 : (index === 0 ? 6 : (index === 1 || index === 2) ? 6 : 4),
    rowSpan: isMobile ? 1 : (index === 0 ? 2 : 1),
    background: index === 0 ? token.colorPrimaryBg : token.colorBgContainer
  }));

  return (
    <EditorialPageShell 
      fullWidth
      noPadding
      breadcrumbItems={[]}
    >
      {/* Hero Section */}
      <HeroEditorial 
        title={`${getGreeting()}, ${user.name || 'Reader'}.`}
        subtitle="Explore our curated collection of knowledge and imagination. Your next favorite book is waiting."
        ctaText="Browse Collection"
        onCtaClick={() => navigate('/search')}
        illustration={
          <div style={{ position: 'relative', width: 300, height: 400, display: isMobile ? 'none' : 'block' }}>
             <BookCoverPro 
                title="The Design of Everyday Things" 
                author="Don Norman" 
                style="swiss" 
                width={280} 
                height={380} 
                className="floating-book"
                baseColor={token.colorPrimary}
             />
             {/* Decorative circle behind */}
             <div style={{ 
               position: 'absolute', 
               top: '50%', 
               left: '50%', 
               transform: 'translate(-50%, -50%)', 
               width: 350, 
               height: 350, 
               borderRadius: '50%', 
               background: token.colorPrimary, 
               opacity: 0.12, 
               zIndex: -1 
             }} />
          </div>
        }
      />

      <div style={{ padding: isMobile ? '0 24px 64px' : '0 48px 64px' }}>
        
        {/* Stats Section (if logged in) */}
        {user.email && (
          <div style={{ marginTop: -40, position: 'relative', zIndex: 2, marginBottom: 64 }}>
            <div className="editorial-grid" style={{ display: isMobile ? 'flex' : 'grid', flexDirection: 'column', gap: 24 }}>
              <div className={isMobile ? "" : "col-span-4"}>
                <StatCard 
                  title="Books Reading" 
                  value={stats.active} 
                  trend={15}
                  trendLabel="vs last month"
                  explanation="You're reading more than usual! Keep it up."
                color={token.colorPrimary}
                />
              </div>
              <div className={isMobile ? "" : "col-span-4"}>
                <StatCard 
                  title="Total Read" 
                  value={stats.total} 
                  trend={5}
                  trendLabel="this year"
                  explanation="Total books completed in your reading journey."
                color={token.colorSuccess}
                />
              </div>
              <div className={isMobile ? "" : "col-span-4"}>
                <Card 
                  bordered={false} 
                  hoverable
                  style={{ 
                    height: '100%', 
                    borderRadius: 16, 
                  background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorBgLayout} 100%)`,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    minHeight: 200
                  }}
                  onClick={() => navigate('/search')}
                >
                  <Space direction="vertical" align="center">
                  <CompassOutlined style={{ fontSize: 32, color: token.colorPrimary }} />
                  <Text style={{ color: token.colorText, fontSize: 16, fontWeight: 500 }}>Discover New Books</Text>
                  </Space>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Trending Section */}
        <EditorialSectionHeader 
          title="Popular List" 
          subtitle="Trending books and recommended reads based on your history."
          actionText="View All Books"
          onActionClick={() => navigate('/search')}
        />

        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <MagazineBentoGrid items={bentoItems} />
        )}

        {/* Categories / Explore Section */}
        <EditorialSectionHeader 
          title="Explore Categories" 
          subtitle="Dive into specific topics and genres."
        />
        
        <div className="editorial-grid" style={{ marginBottom: 64, display: isMobile ? 'flex' : 'grid', flexDirection: 'column', gap: 16 }}>
          {['Fiction', 'Science', 'History', 'Technology', 'Design', 'Business', 'Philosophy', 'Art'].map((cat, i) => (
            <div key={cat} className={isMobile ? "" : "col-span-3"}>
              <Card 
                hoverable 
                bordered={false}
                style={{ 
                  height: 120, 
                  borderRadius: 12, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  background: token.colorBgLayout,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  transition: 'all 0.3s ease'
                }}
                onClick={() => navigate(`/search?category=${cat}`)}
              >
                <Title level={4} style={{ margin: 0, fontFamily: "'Literata', serif", fontWeight: 400 }}>{cat}</Title>
              </Card>
            </div>
          ))}
        </div>

      </div>
    </EditorialPageShell>
  );
};

export default HomePage;
