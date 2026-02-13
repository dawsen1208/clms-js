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
import EditorialPageShell from "../components/common/EditorialPageShell";
import HeroEditorial from "../components/common/HeroEditorial";
import MagazineBentoGrid from "../components/common/MagazineBentoGrid";
import EditorialSectionHeader from "../components/common/EditorialSectionHeader";
import BookCoverPro from "../components/common/BookCoverPro";
import KPIStatCardPro from "../components/common/KPIStatCardPro";
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
      const userData = JSON.parse(sessionUser || localUser);
      setUser(userData);
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
        // Simple logic: take first 5 as trending for demo, or shuffle
        setTrending(allBooks.slice(0, 5));
      }

      // Stats
      let activeCount = 0;
      if (borrowedRes.status === 'fulfilled') {
        const borrowed = borrowedRes.value.data || [];
        setActiveBorrows(borrowed);
        activeCount = borrowed.length;
      }
      
      let historyCount = 0;
      if (historyRes.status === 'fulfilled') {
        const hist = historyRes.value.data || [];
        setHistory(hist.slice(0, 5));
        historyCount = hist.length;
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

  // Transform books for Bento Grid
  const bentoItems = trending.map((book, index) => ({
    id: book.id,
    title: book.title,
    description: book.author,
    category: book.category || 'Fiction',
    meta: `${book.total_copies - book.available_copies} borrowed`,
    // If no cover image, we'll use a generated one or placeholder logic
    coverImage: book.cover_image, 
    // If no cover image, render custom component (handled by BentoGrid check, or we pass a render prop)
    action: (
      <Button 
        shape="circle" 
        icon={<ArrowRightOutlined />} 
        onClick={() => navigate(`/book/${book.id}`)}
      />
    ),
    // Layout logic: First item big (2x2), next two wide (2x1), rest small (1x1)
    colSpan: index === 0 ? 6 : (index === 1 || index === 2) ? 6 : 4,
    rowSpan: index === 0 ? 2 : 1,
    background: index === 0 ? '#FAF9F6' : '#fff'
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
          <div style={{ position: 'relative', width: 300, height: 400 }}>
             <BookCoverPro 
                title="The Design of Everyday Things" 
                author="Don Norman" 
                style="swiss" 
                width={280} 
                height={380} 
                className="floating-book"
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
               background: '#A65D57', 
               opacity: 0.1, 
               zIndex: -1 
             }} />
          </div>
        }
      />

      <div style={{ padding: '0 48px 64px' }}>
        
        {/* Stats Section (if logged in) */}
        {user.email && (
          <div style={{ marginTop: -40, position: 'relative', zIndex: 2, marginBottom: 64 }}>
            <div className="editorial-grid">
              <div className="col-span-4">
                <KPIStatCardPro 
                  title="Books Reading" 
                  value={stats.active} 
                  trendType="up"
                  trendValue="Active"
                  data={[1, 2, 2, 3, stats.active]} // Mock trend
                />
              </div>
              <div className="col-span-4">
                <KPIStatCardPro 
                  title="Total Read" 
                  value={stats.total} 
                  trendType="up"
                  trendValue="+2 this month"
                  data={[stats.total - 2, stats.total - 1, stats.total]} // Mock trend
                  color="#6B8E23"
                />
              </div>
              <div className="col-span-4">
                <Card 
                  bordered={false} 
                  hoverable
                  style={{ 
                    height: '100%', 
                    borderRadius: 16, 
                    background: 'linear-gradient(135deg, #2C3E50 0%, #000000 100%)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate('/search')}
                >
                  <Space direction="vertical" align="center">
                    <CompassOutlined style={{ fontSize: 32, color: '#A65D57' }} />
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: 500 }}>Discover New Books</Text>
                  </Space>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* Trending Section */}
        <EditorialSectionHeader 
          title="Curated for You" 
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
        
        <div className="editorial-grid" style={{ marginBottom: 64 }}>
          {['Fiction', 'Science', 'History', 'Technology'].map((cat, i) => (
            <div key={cat} className="col-span-3">
              <Card 
                hoverable 
                bordered={false}
                style={{ height: 120, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF9F6' }}
                onClick={() => navigate(`/search?category=${cat}`)}
              >
                <Title level={4} style={{ margin: 0, fontFamily: "'Literata', serif" }}>{cat}</Title>
              </Card>
            </div>
          ))}
        </div>

      </div>
    </EditorialPageShell>
  );
};

export default HomePage;
