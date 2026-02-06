import { useEffect, useState, useMemo } from "react";
import {
  Input,
  List,
  Card,
  Button,
  message,
  Spin,
  Select,
  Collapse,
  Modal,
  Grid,
  Typography,
  Segmented,
  Statistic,
  Empty,
  Row,
  Col,
  Tag,
  Drawer,
  Switch,
  Space,
  Tooltip,
  Badge
} from "antd";
import {
  SearchOutlined,
  BookOutlined,
  ReloadOutlined,
  FilterOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  ReadOutlined,
  CheckCircleOutlined,
  TagsOutlined,
  MoreOutlined,
  SortAscendingOutlined,
  ClockCircleOutlined
} from "@ant-design/icons";
import { getBooks, borrowBook, getBorrowedBooks, requestRenewLibrary, requestReturnLibrary, getUserRequestsLibrary } from "../api";
import { isBorrowLimitError, showBorrowLimitModal, extractErrorMessage, showBorrowSuccessModal } from "../utils/borrowUI";
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import EnhancedSearchBar from "../components/EnhancedSearchBar";
import { theme } from "../styles/theme";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "./SearchPage.css";

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;
const { Option } = Select;

function SearchPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  // Data States
  const [allBooks, setAllBooks] = useState([]); // Store all fetched books
  const [displayedBooks, setDisplayedBooks] = useState([]); // Books currently shown
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]); // List of category names
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);

  // User States
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const [userBorrowedBooks, setUserBorrowedBooks] = useState(new Set());
  const [userBorrowedBooksCount, setUserBorrowedBooksCount] = useState({});
  const [borrowedInfo, setBorrowedInfo] = useState({}); // bookId -> { dueDate, daysLeft }
  const [pendingSet, setPendingSet] = useState(new Set()); // server pending bookIds
  
  // UI States
  const [categoryDrawerVisible, setCategoryDrawerVisible] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState("");

  // Statistics
  const stats = useMemo(() => {
    const total = allBooks.length;
    const catCount = categories.length;
    const inStock = allBooks.reduce((s, b) => s + (b.copies > 0 ? 1 : 0), 0);
    return { total, catCount, inStock };
  }, [allBooks, categories]);

  /* =========================================================
     📚 Fetch Data
     ========================================================= */
  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await getBooks();
      const booksData = res.data || [];
      setAllBooks(booksData);
      
      // Extract categories
      const cats = [...new Set(booksData.map(b => b.category || t("search.uncategorized")).filter(Boolean))].sort();
      setCategories(cats);

      // User specific data
      if (token) {
        await fetchUserData();
      }
    } catch (err) {
      console.error("❌ Failed to fetch books:", err);
      message.error(t("search.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    try {
      const borrowedRes = await getBorrowedBooks(token);
      const borrowedBooks = borrowedRes.data || [];
      const borrowedBookIds = new Set(borrowedBooks.map(item => item.bookId || item._id));
      
      const bookCountMap = {};
      const infoMap = {};
      borrowedBooks.forEach(item => {
        const bookId = item.bookId || item._id;
        bookCountMap[bookId] = (bookCountMap[bookId] || 0) + 1;
        const rawDue = item.dueDate || item.due_date || item.expireDate || item.expire_date;
        let daysLeft = null;
        if (rawDue) {
          const due = new Date(rawDue);
          const diffMs = due - new Date();
          daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        }
        infoMap[bookId] = { dueDate: rawDue || null, daysLeft };
      });
      
      setUserBorrowedBooks(borrowedBookIds);
      setUserBorrowedBooksCount(bookCountMap);
      setBorrowedInfo(infoMap);

      try {
        const reqRes = await getUserRequestsLibrary(token);
        const reqs = reqRes.data || [];
        const pend = new Set(
          reqs.filter(r => (r.status || '').toLowerCase() === 'pending').map(r => String(r.bookId))
        );
        setPendingSet(pend);
      } catch (e) {
        // ignore request fetch error
      }
    } catch (err) {
      console.warn("Failed to fetch user data:", err);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [language]); // Reload when language changes to translate categories if needed

  /* =========================================================
     🔍 Filter & Sort Logic
     ========================================================= */
  useEffect(() => {
    let result = [...allBooks];

    // 1. Search Query (Smart Search)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(b => 
        (b.title && b.title.toLowerCase().includes(q)) ||
        (b.author && b.author.toLowerCase().includes(q)) ||
        (b.category && b.category.toLowerCase().includes(q)) ||
        (b.isbn && b.isbn.includes(q))
      );
    }

    // 2. Category Filter
    if (selectedCategory && selectedCategory !== 'all') {
      result = result.filter(b => (b.category || t("search.uncategorized")) === selectedCategory);
    }

    // 3. In Stock Filter
    if (inStockOnly) {
      result = result.filter(b => b.copies > 0);
    }

    // 4. Sorting
    switch (sortBy) {
      case "latest":
        result.sort((a, b) => (b.publishedYear || 0) - (a.publishedYear || 0));
        break;
      case "most_borrowed":
        result.sort((a, b) => (b.borrowedCount || 0) - (a.borrowedCount || 0));
        break;
      case "stock_high":
        result.sort((a, b) => (b.copies || 0) - (a.copies || 0));
        break;
      case "title_asc":
        result.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;
      default:
        break;
    }

    setDisplayedBooks(result);
  }, [allBooks, searchQuery, selectedCategory, inStockOnly, sortBy]);

  /* =========================================================
     ⚡ Actions
     ========================================================= */
  const handleBorrow = async (bookId, title, copies) => {
    if (!token) return message.warning(t("search.loginToBorrow"));
    
    const currentBorrowedCount = userBorrowedBooksCount[bookId] || 0;
    if (currentBorrowedCount >= 2) {
      Modal.info({
        title: t("assistant.borrowLimitTitle"),
        content: t("search.limitMsg"),
        okText: t("assistant.gotIt"),
      });
      return;
    }
    
    if (copies <= 0) {
      Modal.info({
        title: t("assistant.outOfStockTitle"),
        content: t("assistant.outOfStockMsg"),
        okText: t("assistant.gotIt"),
      });
      return;
    }

    try {
      const res = await borrowBook(bookId, token);
      setSuccessTitle(title);
      showBorrowSuccessModal(title);
      message.success(res.data.message || t("search.borrowSuccessMsg", { title }));
      fetchBooks(); // Refresh data
    } catch (err) {
      if (err?.__borrowLimit || isBorrowLimitError(extractErrorMessage(err))) {
        setLimitOpen(true);
        showBorrowLimitModal();
      } else {
        message.error(extractErrorMessage(err) || t("assistant.borrowFailed"));
      }
    }
  };

  /* =========================================================
     🎨 Render Helpers
     ========================================================= */
  const renderBookCard = (book) => {
    const isBorrowed = userBorrowedBooks.has(book._id || book.id);
    const copies = book.copies || 0;
    const hasStock = copies > 0;

    if (viewMode === 'list') {
      return (
        <div key={book._id} className="book-list-item card-clean">
          <Row gutter={16} align="middle">
            <Col flex="80px">
              <div className="book-cover-placeholder-sm" style={{ background: theme.token.colorPrimary + '20', color: theme.token.colorPrimary }}>
                <BookOutlined />
              </div>
            </Col>
            <Col flex="auto">
              <Title level={5} style={{ margin: 0 }}>{book.title}</Title>
              <Text type="secondary">{book.author}</Text>
              <div style={{ marginTop: 4 }}>
                <Tag>{book.category || t("search.uncategorized")}</Tag>
                <Tag>{book.publishedYear}</Tag>
              </div>
            </Col>
            <Col>
              <Space direction="vertical" align="end">
                <Text type={hasStock ? "success" : "danger"} strong>
                  {hasStock ? `${copies} ${t("search.left")}` : t("search.out")}
                </Text>
                <Button 
                  type={hasStock ? "primary" : "default"} 
                  disabled={!hasStock || isBorrowed}
                  onClick={() => handleBorrow(book._id || book.id, book.title, copies)}
                >
                  {isBorrowed ? t("search.borrowed") : t("search.borrowBtn")}
                </Button>
              </Space>
            </Col>
          </Row>
        </div>
      );
    }

    // Grid View
    return (
      <Col xs={24} sm={12} md={8} lg={6} xl={6} key={book._id}>
        <div className="kpi-card" style={{ height: '100%', justifyContent: 'space-between', padding: 20 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div className="book-cover-placeholder" style={{ width: 48, height: 64, borderRadius: 4, background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#bfbfbf' }}>
                <BookOutlined />
              </div>
              <Tag color={hasStock ? "success" : "error"}>
                {hasStock ? `${copies} in stock` : "Out of stock"}
              </Tag>
            </div>
            
            <Title level={5} className="text-clamp-2" style={{ marginBottom: 4, minHeight: 44 }} title={book.title}>
              {book.title}
            </Title>
            <Text type="secondary" className="text-clamp-1" style={{ display: 'block', marginBottom: 12 }} title={book.author}>
              {book.author}
            </Text>
            
            <div style={{ marginBottom: 16 }}>
              <Tag style={{ marginRight: 4 }}>{book.category}</Tag>
              <Text type="secondary" style={{ fontSize: 12 }}>{book.publishedYear}</Text>
            </div>
          </div>

          <Button 
            type="primary" 
            block 
            disabled={!hasStock || isBorrowed}
            onClick={() => handleBorrow(book._id || book.id, book.title, copies)}
            style={{ borderRadius: 8 }}
          >
            {isBorrowed ? t("search.borrowed") : t("search.borrowBtn")}
          </Button>
        </div>
      </Col>
    );
  };

  return (
    <div className="page-container">
      {/* 1. Header with Restrained KPIs */}
      <div style={{ marginBottom: 32 }}>
        <Row gutter={24} align="middle">
          <Col xs={24} md={12}>
            <Title level={2} style={{ margin: 0 }}>{t("search.title")}</Title>
            <Text type="secondary">Explore our collection of {stats.total} books across {stats.catCount} categories</Text>
          </Col>
          <Col xs={24} md={12} style={{ textAlign: isMobile ? 'left' : 'right', marginTop: isMobile ? 16 : 0 }}>
            <Space size="large" split={<div style={{ width: 1, height: 16, background: '#e8e8e8' }} />}>
              <Statistic title={t("search.totalBooks")} value={stats.total} valueStyle={{ fontSize: 20, fontWeight: 600 }} />
              <Statistic title={t("search.categories")} value={stats.catCount} valueStyle={{ fontSize: 20, fontWeight: 600 }} />
              <Statistic title={t("search.inStock")} value={stats.inStock} valueStyle={{ fontSize: 20, fontWeight: 600 }} />
            </Space>
          </Col>
        </Row>
      </div>

      {/* 2. Search Section */}
      <div style={{ marginBottom: 24 }}>
        <EnhancedSearchBar 
          onSearch={(val) => setSearchQuery(val)} 
          loading={loading}
          books={allBooks} // Pass books for autocomplete
        />
        
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          {/* Categories: Top 5 + More */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Text strong style={{ marginRight: 8 }}>{t("search.category")}:</Text>
            <Tag.CheckableTag 
              checked={selectedCategory === 'all'} 
              onChange={() => setSelectedCategory('all')}
              style={{ borderRadius: 12, padding: '4px 12px' }}
            >
              {t("search.allBooks")}
            </Tag.CheckableTag>
            
            {categories.slice(0, 5).map(cat => (
              <Tag.CheckableTag
                key={cat}
                checked={selectedCategory === cat}
                onChange={(checked) => setSelectedCategory(checked ? cat : 'all')}
                style={{ borderRadius: 12, padding: '4px 12px' }}
              >
                {cat}
              </Tag.CheckableTag>
            ))}
            
            {categories.length > 5 && (
              <Tag 
                icon={<MoreOutlined />} 
                style={{ cursor: 'pointer', borderRadius: 12, borderStyle: 'dashed' }}
                onClick={() => setCategoryDrawerVisible(true)}
              >
                More
              </Tag>
            )}
          </div>

          {/* Advanced Filters Toggle */}
          <Button 
            type={showAdvanced ? "primary" : "default"} 
            ghost={showAdvanced}
            icon={<FilterOutlined />} 
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {t("search.filter")}
          </Button>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvanced && (
          <div className="card-clean" style={{ marginTop: 16, padding: 20, background: '#fafafa' }}>
            <Row gutter={[24, 24]}>
              <Col xs={24} sm={8}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>{t("search.sort")}</Text>
                <Select 
                  value={sortBy} 
                  onChange={setSortBy} 
                  style={{ width: '100%' }}
                  options={[
                    { value: 'latest', label: t("search.latest") },
                    { value: 'most_borrowed', label: t("search.popular") },
                    { value: 'stock_high', label: t("search.inStock") },
                    { value: 'title_asc', label: 'Title (A-Z)' },
                  ]}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>View Mode</Text>
                <Segmented 
                  value={viewMode} 
                  onChange={setViewMode}
                  options={[
                    { value: 'grid', icon: <AppstoreOutlined />, label: 'Grid' },
                    { value: 'list', icon: <UnorderedListOutlined />, label: 'List' },
                  ]}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Availability</Text>
                <Switch 
                  checked={inStockOnly} 
                  onChange={setInStockOnly} 
                  checkedChildren="In Stock Only" 
                  unCheckedChildren="Show All" 
                />
              </Col>
            </Row>
          </div>
        )}
      </div>

      {/* 3. Results Section */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}><Spin size="large" /></div>
      ) : (
        <>
          {displayedBooks.length > 0 ? (
            <Row gutter={[24, 24]}>
              {viewMode === 'list' ? (
                <Col span={24}>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                     {displayedBooks.map(book => renderBookCard(book))}
                   </div>
                </Col>
              ) : (
                displayedBooks.map(book => renderBookCard(book))
              )}
            </Row>
          ) : (
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
              description={
                <span>
                  No books found. <br/>
                  <Text type="secondary">Try adjusting your search or filters.</Text>
                </span>
              }
            >
              <Button onClick={() => { setSearchQuery(""); setSelectedCategory("all"); setInStockOnly(false); }}>
                Clear Filters
              </Button>
            </Empty>
          )}
        </>
      )}

      {/* Drawers & Modals */}
      <Drawer
        title="All Categories"
        placement="right"
        onClose={() => setCategoryDrawerVisible(false)}
        open={categoryDrawerVisible}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <Tag.CheckableTag 
            checked={selectedCategory === 'all'} 
            onChange={() => { setSelectedCategory('all'); setCategoryDrawerVisible(false); }}
            style={{ padding: '6px 12px', fontSize: 14 }}
          >
            {t("search.allBooks")}
          </Tag.CheckableTag>
          {categories.map(cat => (
            <Tag.CheckableTag
              key={cat}
              checked={selectedCategory === cat}
              onChange={() => { setSelectedCategory(cat); setCategoryDrawerVisible(false); }}
              style={{ padding: '6px 12px', fontSize: 14 }}
            >
              {cat}
            </Tag.CheckableTag>
          ))}
        </div>
      </Drawer>

      <Modal 
        open={!!successTitle} 
        title={t("search.success")} 
        onOk={() => setSuccessTitle("")} 
        onCancel={() => setSuccessTitle("")} 
        centered 
        footer={null}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
          <Title level={4}>"{successTitle}" {t("search.borrowSuccess")}</Title>
          <Button type="primary" onClick={() => setSuccessTitle("")} block size="large" style={{ marginTop: 20 }}>
            {t("common.close")}
          </Button>
        </div>
      </Modal>

      <Modal 
        open={limitOpen} 
        title={t("search.limitReached")} 
        onOk={() => setLimitOpen(false)} 
        onCancel={() => setLimitOpen(false)} 
        centered 
        footer={null}
      >
        <div style={{ padding: '10px' }}>
          <p>{t("search.limitReachedMsg")}</p>
          <Button type="primary" onClick={() => setLimitOpen(false)} block>{t("common.close")}</Button>
        </div>
      </Modal>
    </div>
  );
}

export default SearchPage;
