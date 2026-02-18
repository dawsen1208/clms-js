import React, { useEffect, useState } from "react";
import { Typography, Button, Skeleton, Space, Card, Grid, theme } from "antd";
import { 
  ArrowRightOutlined,
  CompassOutlined,
  ReadOutlined,
  SearchOutlined,
  RobotOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import EditorialPageShell from "../components/common/EditorialPageShell";
import HeroEditorial from "../components/common/HeroEditorial";
import MagazineBentoGrid from "../components/common/MagazineBentoGrid";
import EditorialSectionHeader from "../components/common/EditorialSectionHeader";
import BookCoverPro from "../components/common/BookCoverPro";
import { getCleanImageUrl } from "../utils/imageUtils";
import StatCard from "../components/cards/StatCard";
import { getBooks, getRecommendations, getBorrowedBooks, getBorrowHistory } from "../api";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const { useToken } = theme;

const useHomeData = () => {
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const { token } = useToken();
  const [user, setUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [trending, setTrending] = useState([]);
  const [allBooks, setAllBooks] = useState([]);
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

      const [allBooksRes, , borrowedRes, historyRes] = await Promise.allSettled([
        getBooks(),
        getRecommendations(token),
        getBorrowedBooks(token),
        getBorrowHistory(token)
      ]);

      // Process Recommendations
      if (allBooksRes.status === 'fulfilled') {
        const allBooksData = allBooksRes.value.data || [];
        setAllBooks(allBooksData);
        const seenTitles = new Set();
        const unique = [];
        for (const book of allBooksData) {
          const key = (book.title || '').toLowerCase().trim();
          if (!key || seenTitles.has(key)) continue;
          seenTitles.add(key);
          unique.push(book);
          if (unique.length >= 5) break;
        }
        const nextTrending = unique.length > 0 ? unique : allBooksData.slice(0, 5);
        setTrending(nextTrending);
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

  const baseList = trending.length > 0 ? trending : popularList;

  const resolveTargetPath = (book) => {
    const match = (allBooks || []).find(b => 
      (b.title || '').toLowerCase().trim() === (book.title || '').toLowerCase().trim()
    );
    if (match && (match._id || match.id)) {
      return `/book/${match._id || match.id}`;
    }
    const q = encodeURIComponent(book.title || '');
    return `/search?query=${q}`;
  };

  const bentoItems = baseList.map((book, index) => {
    const target = resolveTargetPath(book);
    const matched = (allBooks || []).find(b => (b.title || '').toLowerCase().trim() === (book.title || '').toLowerCase().trim());
    const coverImage = getCleanImageUrl(matched?.coverImage || book.cover_image || "");
    const coverImageSet = matched?.coverImageSet;
    const coverSrcSet = coverImageSet ? [
      coverImageSet.w160 ? `${coverImageSet.w160} 160w` : null,
      coverImageSet.w240 ? `${coverImageSet.w240} 240w` : null,
      coverImageSet.w360 ? `${coverImageSet.w360} 360w` : null,
    ].filter(Boolean).join(', ') : undefined;
    const coverSizes = "(min-width: 992px) 220px, (min-width: 576px) 180px, 45vw";

    const availableCopies = matched?.available_copies ?? matched?.copies ?? undefined;
    const totalCopies = matched?.total_copies ?? matched?.totalCopies ?? matched?.total ?? matched?.copies ?? undefined;

    return {
      id: book.id,
      title: book.title,
      description: book.author,
      category: book.category,
      meta: 'Popular',
      availableCopies,
      totalCopies,
      coverImage,
      coverSrcSet,
      coverSizes,
      coverNode: (
        <BookCoverPro 
          title={book.title} 
          author={book.author} 
          width={180} 
          height={240} 
          style={index % 2 === 0 ? "swiss" : "serif"}
          baseColor={token.colorPrimary}
        />
      ),
      action: (
        <Button 
          size="small"
          type="default"
          icon={<ArrowRightOutlined />} 
          onClick={(e) => { e.stopPropagation(); navigate(target); }}
        >
          View
        </Button>
      ),
      onClick: () => navigate(target),
      colSpan: isMobile ? 12 : (index === 0 ? 6 : (index === 1 || index === 2) ? 6 : 4),
      rowSpan: isMobile ? 1 : (index === 0 ? 2 : 1),
      background: index === 0 ? token.colorPrimaryBg : token.colorBgContainer
    };
  });

  return {
    user,
    stats,
    loading,
    isMobile,
    token,
    navigate,
    getGreeting,
    bentoItems,
  };
};

export const HomeLeft = () => {
  const { user, stats, loading, isMobile, token, navigate, getGreeting } =
    useHomeData();

  return (
    <div style={{ padding: isMobile ? 16 : 24 }}>
      <div style={{ marginBottom: 24 }}>
        <Title
          level={3}
          style={{
            marginBottom: 4,
            fontFamily: "'Literata', serif",
          }}
        >
          {getGreeting()}, {user.name || "Reader"}.
        </Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Keep track of your reading and jump back into your next book.
        </Text>
      </div>

      <div style={{ marginBottom: 24 }}>
        {loading ? (
          <Skeleton active paragraph={{ rows: 2 }} />
        ) : (
          <div
            className="editorial-grid"
            style={{
              display: isMobile ? "flex" : "grid",
              flexDirection: isMobile ? "column" : undefined,
              gap: 16,
            }}
          >
            <div className={isMobile ? "" : "col-span-4"}>
              <StatCard
                title="Active Loans"
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
                explanation="Books completed in your reading journey."
                color={token.colorSuccess}
              />
            </div>
            <div className={isMobile ? "" : "col-span-4"}>
              <Card
                bordered={false}
                hoverable
                style={{
                  height: "100%",
                  borderRadius: 16,
                  background: `linear-gradient(135deg, ${token.colorBgContainer} 0%, ${token.colorBgLayout} 100%)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  minHeight: 140,
                }}
                onClick={() => navigate("/search")}
              >
                <Space direction="vertical" align="center">
                  <CompassOutlined
                    style={{ fontSize: 28, color: token.colorPrimary }}
                  />
                  <Text
                    style={{
                      color: token.colorText,
                      fontSize: 14,
                      fontWeight: 500,
                    }}
                  >
                    Discover New Books
                  </Text>
                </Space>
              </Card>
            </div>
          </div>
        )}
      </div>

      <div>
        <Card
          bordered={false}
          className="editorial-card"
          style={{
            borderRadius: 16,
            boxShadow: token.boxShadowSecondary,
          }}
        >
          <Title
            level={4}
            style={{
              margin: "0 0 12px 0",
              fontFamily: "'Literata', serif",
            }}
          >
            Quick Actions
          </Title>
          <div
            style={{
              marginTop: 4,
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
              gap: 8,
            }}
          >
            <Button
              icon={<SearchOutlined />}
              onClick={() => navigate("/search")}
              type="default"
              block
              style={{
                justifyContent: "flex-start",
                padding: "10px 14px",
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                borderColor: token.colorBorderSecondary,
              }}
            >
              Search Library
            </Button>
            <Button
              icon={<ReadOutlined />}
              onClick={() => navigate("/borrow")}
              type="default"
              block
              style={{
                justifyContent: "flex-start",
                padding: "10px 14px",
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                borderColor: token.colorBorderSecondary,
              }}
            >
              My Borrowed Books
            </Button>
            <Button
              icon={<RobotOutlined />}
              onClick={() => navigate("/assistant")}
              type="default"
              block
              style={{
                justifyContent: "flex-start",
                padding: "10px 14px",
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                borderColor: token.colorBorderSecondary,
              }}
            >
              Smart Assistant
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export const HomeRight = () => {
  const { isMobile, loading, bentoItems, token, navigate } = useHomeData();

  return (
    <EditorialPageShell fullWidth noPadding breadcrumbItems={[]}>
      <div
        style={{
          padding: isMobile ? "24px 24px 64px" : "32px 48px 64px",
        }}
      >
        <EditorialSectionHeader
          title="Popular List"
          subtitle="Trending books and recommended reads based on your history."
          actionText="View All Books"
          onActionClick={() => navigate("/search")}
        />

        {loading ? (
          <Skeleton active paragraph={{ rows: 4 }} />
        ) : (
          <MagazineBentoGrid items={bentoItems} mode="list" />
        )}

        <EditorialSectionHeader
          title="Explore Categories"
          subtitle="Dive into specific topics and genres."
        />

        <div
          className="editorial-grid"
          style={{
            marginBottom: 64,
            display: isMobile ? "flex" : "grid",
            flexDirection: isMobile ? "column" : undefined,
            gap: 16,
          }}
        >
          {[
            "Fiction",
            "Science",
            "History",
            "Technology",
            "Design",
            "Business",
            "Philosophy",
            "Art",
          ].map((cat) => (
            <div key={cat} className={isMobile ? "" : "col-span-3"}>
              <Card
                hoverable
                bordered={false}
                style={{
                  height: 120,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: token.colorBgLayout,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  transition: "all 0.3s ease",
                }}
                onClick={() => navigate(`/search?category=${cat}`)}
              >
                <Title
                  level={5}
                  style={{
                    margin: 0,
                    fontFamily: "'Literata', serif",
                    fontWeight: 400,
                    fontSize: 16,
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat}
                </Title>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </EditorialPageShell>
  );
};

const HomePage = () => {
  return <HomeRight />;
};

export default HomePage;
