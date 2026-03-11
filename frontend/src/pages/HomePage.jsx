import React, { useEffect, useState } from "react";
import { Typography, Button, Skeleton, Space, Card, Grid, theme, Collapse } from "antd";
import { 
  ArrowRightOutlined,
  CompassOutlined,
  ReadOutlined,
  SearchOutlined,
  RobotOutlined
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import EditorialPageShell from "../components/common/EditorialPageShell";
import HeroEditorial from "../components/common/HeroEditorial";
import MagazineBentoGrid from "../components/common/MagazineBentoGrid";
import EditorialSectionHeader from "../components/common/EditorialSectionHeader";
import BookCoverPro from "../components/common/BookCoverPro";
import { getCleanImageUrl } from "../utils/imageUtils";
import StatCard from "../components/cards/StatCard";
import { getBooks, getRecommendations, getBorrowHistory, getBorrowedBooks } from "../api";

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
  const { language } = useLanguage();
  const isZh = language === "zh";

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
            {isZh ? "帮助" : "Help"}
          </Title>
          <Space direction="vertical" size={12} style={{ width: "100%" }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {isZh
                ? "新用户快速上手：搜索 → 借阅 → 归还；也可以用智能助手做推荐与对比。"
                : "New here? Start with search → borrow → return. You can also use the Smart Assistant for recommendations and comparisons."}
            </Text>

            <Collapse
              ghost
              defaultActiveKey={["start"]}
              style={{ background: "transparent" }}
            >
              <Collapse.Panel header={isZh ? "快速上手" : "Getting Started"} key="start">
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <SearchOutlined style={{ marginTop: 2, color: token.colorPrimary }} />
                    <div style={{ flex: 1 }}>
                      <Text strong>{isZh ? "1）搜索图书" : "1) Search books"}</Text>
                      <div style={{ marginTop: 2 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {isZh ? "按书名/作者/分类筛选，点击封面进入详情。" : "Filter by title/author/category and open the book detail page."}
                        </Text>
                      </div>
                      <Button type="link" onClick={() => navigate("/search")} style={{ padding: 0, height: "auto" }}>
                        {isZh ? "打开图书馆" : "Open Library"}
                      </Button>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <ReadOutlined style={{ marginTop: 2, color: token.colorPrimary }} />
                    <div style={{ flex: 1 }}>
                      <Text strong>{isZh ? "2）借阅与查看我的书" : "2) Borrow & view My Books"}</Text>
                      <div style={{ marginTop: 2 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {isZh ? "在书籍详情点击 Borrow；借阅记录在 My Books 中查看。" : "Borrow from the book detail page; manage active loans in My Books."}
                        </Text>
                      </div>
                      <Button type="link" onClick={() => navigate("/borrow")} style={{ padding: 0, height: "auto" }}>
                        {isZh ? "打开我的借阅" : "Open My Books"}
                      </Button>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <RobotOutlined style={{ marginTop: 2, color: token.colorPrimary }} />
                    <div style={{ flex: 1 }}>
                      <Text strong>{isZh ? "3）用智能助手推荐/对比" : "3) Use Smart Assistant to recommend/compare"}</Text>
                      <div style={{ marginTop: 2 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {isZh ? "选择 2–6 本书对比，查看表格 + 雷达图强项维度。" : "Compare 2–6 books and see strengths via table + radar chart."}
                        </Text>
                      </div>
                      <Button type="link" onClick={() => navigate("/assistant")} style={{ padding: 0, height: "auto" }}>
                        {isZh ? "打开智能助手" : "Open Assistant"}
                      </Button>
                    </div>
                  </div>
                </Space>
              </Collapse.Panel>

              <Collapse.Panel header={isZh ? "常见问题" : "FAQs"} key="faq">
                <Collapse ghost accordion>
                  <Collapse.Panel header={isZh ? "为什么借阅按钮不可用/借不到书？" : "Why can’t I borrow a book?"} key="q1">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {isZh
                        ? "常见原因：库存为 0、已达到同时借阅上限（最多 5 本）、或账号状态未通过审批。可以先搜索其他书或先归还部分。"
                        : "Common reasons: no stock available, you reached the max active loans (5), or your account is pending approval. Try another title or return some books first."}
                    </Text>
                  </Collapse.Panel>
                  <Collapse.Panel header={isZh ? "如何快速找到想要的书？" : "How do I find a book faster?"} key="q2">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {isZh
                        ? "在 Library 使用搜索框输入书名/作者；也可以用分类筛选与排序。"
                        : "Use the Library search box for title/author; filter by category and sort to narrow results."}
                    </Text>
                    <div style={{ marginTop: 6 }}>
                      <Button type="link" onClick={() => navigate("/search")} style={{ padding: 0, height: "auto" }}>
                        {isZh ? "去 Library" : "Go to Library"}
                      </Button>
                    </div>
                  </Collapse.Panel>
                  <Collapse.Panel header={isZh ? "书评提交后还能修改吗？" : "Can I edit my review later?"} key="q3">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {isZh
                        ? "可以。同一用户对同一本书只保留一条书评，再次提交会更新你的评分与内容。"
                        : "Yes. Each user has one review per book; submitting again updates your rating and comment."}
                    </Text>
                  </Collapse.Panel>
                  <Collapse.Panel header={isZh ? "验证码过期/邮箱绑定失败怎么办？" : "My verification code expired—what should I do?"} key="q4">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {isZh
                        ? "回到 Settings 的邮箱模块重新发送验证码即可；旧验证码过期后无法使用。"
                        : "Go to Settings → email section and request a new code. Expired codes can’t be reused."}
                    </Text>
                    <div style={{ marginTop: 6 }}>
                      <Button type="link" onClick={() => navigate("/settings?pane=notifications")} style={{ padding: 0, height: "auto" }}>
                        {isZh ? "去设置" : "Open Settings"}
                      </Button>
                    </div>
                  </Collapse.Panel>
                </Collapse>
              </Collapse.Panel>
            </Collapse>
          </Space>
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
