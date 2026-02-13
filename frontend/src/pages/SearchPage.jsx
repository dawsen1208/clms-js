import React, { useEffect, useState, useMemo } from "react";
import {
  Input,
  List,
  Button,
  message,
  Select,
  Typography,
  Row,
  Col,
  Tag,
  Drawer,
  Checkbox,
  Space,
  Radio,
  Empty,
  Badge,
  Switch,
  Modal,
  AutoComplete,
  Card,
  Divider,
  Layout,
  Menu
} from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  AppstoreOutlined,
  BarsOutlined,
  SortAscendingOutlined,
  ReloadOutlined,
  BookOutlined,
  ReadOutlined,
  ExperimentOutlined,
  RocketOutlined,
  HourglassOutlined,
  UserOutlined,
  BankOutlined,
  BgColorsOutlined,
  CloseOutlined
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import PageShell from "../components/common/PageShell";
import Section from "../components/common/Section";
import EmptyState from "../components/common/EmptyState";
import ModernBookCard from "../components/common/ModernBookCard";
import { getBooks, borrowBook, getBorrowedBooks, getUserRequestsLibrary } from "../api";
import { isBorrowLimitError, showBorrowLimitModal, extractErrorMessage } from "../utils/borrowUI";

const { Title, Text } = Typography;
const { Sider, Content } = Layout;

const SearchPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const [modal, contextHolder] = Modal.useModal();
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  
  // Filter States
  const [searchText, setSearchText] = useState("");
  const [searchOptions, setSearchOptions] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");
  
  // UI States
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  
  // User Data
  const [userBorrowedBooks, setUserBorrowedBooks] = useState(new Set());
  const [pendingRequests, setPendingRequests] = useState(new Set());
  
  // Parse URL query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    const sort = params.get('sort');
    if (q) setSearchText(q);
    if (sort) setSortBy(sort);
  }, [location.search]);

  // Derived Data
  const categories = useMemo(() => {
    const cats = new Set(books.map(b => b.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [books]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    books.forEach(b => {
      const cat = b.category || "Uncategorized";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [books]);

  const toggleCategory = (cat) => {
    const newCats = selectedCategories.includes(cat)
      ? selectedCategories.filter(c => c !== cat)
      : [...selectedCategories, cat];
    setSelectedCategories(newCats);
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchText, selectedCategories, showAvailableOnly, sortBy, books]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const promises = [getBooks()];
      if (token) {
        promises.push(getBorrowedBooks(token));
        promises.push(getUserRequestsLibrary(token));
      }

      const results = await Promise.allSettled(promises);
      
      // Books
      if (results[0].status === 'fulfilled') {
        setBooks(results[0].value.data);
      }
      
      // Borrowed
      if (token && results[1].status === 'fulfilled') {
        const borrowedIds = new Set(results[1].value.data.map(b => b._id || b.bookId?._id || b.bookId));
        setUserBorrowedBooks(borrowedIds);
      }

      // Pending
      if (token && results[2].status === 'fulfilled') {
         const pendingIds = new Set(results[2].value.data.filter(r => r.status === 'pending').map(r => r.bookId));
         setPendingRequests(pendingIds);
      }

    } catch (error) {
      console.error("Error loading data:", error);
      message.error("Failed to load library data");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...books];

    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(b => 
        b.title.toLowerCase().includes(lower) || 
        b.author.toLowerCase().includes(lower) ||
        b.isbn?.includes(lower)
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter(b => selectedCategories.includes(b.category));
    }

    if (showAvailableOnly) {
      result = result.filter(b => b.copies > 0);
    }

    switch (sortBy) {
      case "newest":
        // Assuming _id is somewhat chronological or use publishDate if available
        result.sort((a, b) => (b._id || "").localeCompare(a._id || "")); 
        break;
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "author":
        result.sort((a, b) => a.author.localeCompare(b.author));
        break;
      case "popular":
        result.sort((a, b) => (b.borrowCount || 0) < (a.borrowCount || 0) ? 1 : -1); 
        break;
      default:
        break;
    }

    setFilteredBooks(result);
  };

  const handleSearch = (value) => {
    setSearchText(value);
    if (!value) {
      setSearchOptions([]);
      return;
    }
    
    // Auto-complete logic
    const lower = value.toLowerCase();
    const suggestions = books
      .filter(b => b.title.toLowerCase().includes(lower))
      .slice(0, 5)
      .map(b => ({ value: b.title, label: b.title }));
    
    setSearchOptions(suggestions);
  };

  const handleBorrow = async (bookId, title, copies) => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
      message.warning(t("common.loginFirst"));
      return;
    }
    
    modal.confirm({
      title: t("borrow.confirmTitle") || "Confirm Borrow",
      content: t("borrow.confirmContent", { title }) || `Are you sure you want to borrow "${title}"?`,
      okText: t("common.confirm") || "Yes",
      cancelText: t("common.cancel") || "No",
      onOk: async () => {
        try {
          await borrowBook(bookId, token);
          message.success(t("borrow.borrowSuccess") || "Borrowed successfully!");
          fetchData(); // Refresh data
        } catch (error) {
          const errorMsg = extractErrorMessage(error);
          if (error.__borrowLimit || isBorrowLimitError(errorMsg)) {
            showBorrowLimitModal(t, modal);
          } else {
            message.error(errorMsg);
          }
        }
      }
    });
  };

  const FilterPanel = ({ mobile = false }) => (
    <div style={{ padding: mobile ? 0 : '0 8px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 16
        }}>
          <Title level={5} style={{ margin: 0 }}>Availability</Title>
        </div>
        <div style={{ 
          background: '#fff', 
          border: '1px solid #f0f0f0',
          borderRadius: 12,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer'
        }} onClick={() => setShowAvailableOnly(!showAvailableOnly)}>
          <Text>In Stock Only</Text>
          <Switch checked={showAvailableOnly} onChange={setShowAvailableOnly} size="small" />
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 16
        }}>
          <Title level={5} style={{ margin: 0 }}>Categories</Title>
          {selectedCategories.length > 0 && (
            <Button type="link" size="small" onClick={() => setSelectedCategories([])} style={{ padding: 0 }}>
              Clear
            </Button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categories.map(cat => {
            const isSelected = selectedCategories.includes(cat);
            return (
              <div 
                key={cat}
                onClick={() => toggleCategory(cat)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: isSelected ? '#E6F7FF' : 'transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s',
                  color: isSelected ? '#1677FF' : 'inherit'
                }}
              >
                 <Space>
                   <Checkbox checked={isSelected} style={{ pointerEvents: 'none' }} />
                   <Text style={{ color: isSelected ? '#1677FF' : 'inherit' }}>{cat}</Text>
                 </Space>
                 <Text type="secondary" style={{ fontSize: 12 }}>{categoryCounts[cat]}</Text>
              </div>
            );
          })}
        </div>
      </div>

      <Button block onClick={() => {
        setSearchText("");
        setSelectedCategories([]);
        setShowAvailableOnly(false);
        setSortBy("newest");
      }}>
        Reset All Filters
      </Button>
    </div>
  );

  return (
    <PageShell
      title="Browse Library"
      subtitle="Discover your next favorite book from our collection"
      breadcrumbItems={[
        { title: 'Home', path: '/home' },
        { title: 'Browse' }
      ]}
      extra={
        <Button 
          icon={<FilterOutlined />} 
          onClick={() => setFilterDrawerOpen(true)}
          className="mobile-only-block"
          style={{ display: 'none' }} 
        >
          Filters
        </Button>
      }
    >
      {contextHolder}
      
      <Layout style={{ background: 'transparent' }}>
        <Sider 
          width={280} 
          theme="light" 
          style={{ 
            background: 'transparent', 
            marginRight: 24, 
            display: 'none' // Hidden on mobile via CSS usually, but here explicit check needed for responsiveness if not using Grid
          }}
          className="desktop-only-block"
          breakpoint="lg"
          collapsedWidth="0"
          trigger={null}
        >
          <div style={{ position: 'sticky', top: 24 }}>
             <FilterPanel />
          </div>
        </Sider>

        <Content>
          <div style={{ marginBottom: 24 }}>
            <Row gutter={[16, 16]} align="middle">
              <Col flex="auto">
                <AutoComplete
                  options={searchOptions}
                  style={{ width: '100%' }}
                  onSelect={setSearchText}
                  onSearch={handleSearch}
                  value={searchText}
                >
                  <Input.Search 
                    placeholder="Search by title, author, or ISBN..." 
                    size="large"
                    allowClear
                    enterButton={<Button type="primary" icon={<SearchOutlined />}>Search</Button>}
                    style={{ width: '100%' }}
                  />
                </AutoComplete>
              </Col>
              <Col>
                <Select 
                  value={sortBy} 
                  onChange={setSortBy} 
                  size="large"
                  style={{ width: 180 }}
                  options={[
                    { label: "Newest Arrivals", value: "newest" },
                    { label: "Title (A-Z)", value: "title" },
                    { label: "Author (A-Z)", value: "author" },
                    { label: "Most Popular", value: "popular" },
                  ]}
                />
              </Col>
              <Col>
                 <Radio.Group value={viewMode} onChange={e => setViewMode(e.target.value)} size="large" buttonStyle="solid">
                  <Radio.Button value="grid"><AppstoreOutlined /></Radio.Button>
                  <Radio.Button value="list"><BarsOutlined /></Radio.Button>
                </Radio.Group>
              </Col>
            </Row>

            {/* Active Filters Tags */}
            {(searchText || selectedCategories.length > 0 || showAvailableOnly) && (
              <div style={{ marginTop: 16 }}>
                <Space wrap>
                  <Text type="secondary">Active Filters:</Text>
                  {searchText && (
                    <Tag closable onClose={() => setSearchText("")}>Search: {searchText}</Tag>
                  )}
                  {showAvailableOnly && (
                    <Tag closable onClose={() => setShowAvailableOnly(false)} color="blue">In Stock Only</Tag>
                  )}
                  {selectedCategories.map(cat => (
                    <Tag key={cat} closable onClose={() => toggleCategory(cat)} color="cyan">{cat}</Tag>
                  ))}
                  <Button type="link" size="small" onClick={() => {
                    setSearchText("");
                    setSelectedCategories([]);
                    setShowAvailableOnly(false);
                  }} style={{ padding: 0 }}>
                    Clear All
                  </Button>
                </Space>
              </div>
            )}
          </div>

          {loading ? (
             <EmptyState 
                title="Loading Library..." 
                description="Please wait while we fetch the books." 
                icon={<LoadingIcon />}
             />
          ) : filteredBooks.length > 0 ? (
            viewMode === 'grid' ? (
              <Row gutter={[24, 24]}>
                {filteredBooks.map(book => (
                  <Col xs={24} sm={12} md={12} lg={8} xl={6} key={book._id || book.id}>
                    <ModernBookCard 
                      book={book} 
                      variant="search"
                      onBorrow={handleBorrow}
                      onView={() => navigate(`/book/${book._id || book.id}`)}
                      isBorrowed={userBorrowedBooks.has(book._id || book.id)}
                      isPending={pendingRequests.has(book._id || book.id)}
                    />
                  </Col>
                ))}
              </Row>
            ) : (
              <div style={{ background: '#fff', borderRadius: 16, padding: 8 }}>
                <List
                  itemLayout="vertical"
                  size="large"
                  pagination={{
                    onChange: (page) => {
                      console.log(page);
                    },
                    pageSize: 10,
                  }}
                  dataSource={filteredBooks}
                  renderItem={(book) => (
                    <List.Item
                      key={book._id || book.id}
                      extra={
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 16 }}>
                          <Button 
                            type="primary" 
                            disabled={book.copies <= 0 || userBorrowedBooks.has(book._id || book.id)}
                            onClick={() => handleBorrow(book._id || book.id, book.title, book.copies)}
                          >
                             {userBorrowedBooks.has(book._id || book.id) ? "Borrowed" : book.copies <= 0 ? "Out of Stock" : "Borrow Now"}
                          </Button>
                          <Text type="secondary">{book.copies} copies left</Text>
                        </div>
                      }
                      onClick={() => navigate(`/book/${book._id || book.id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <List.Item.Meta
                        avatar={<div style={{ width: 60, height: 80, background: '#f0f0f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOutlined style={{ fontSize: 24, color: '#bfbfbf' }} /></div>}
                        title={<a onClick={(e) => { e.preventDefault(); navigate(`/book/${book._id || book.id}`); }}>{book.title}</a>}
                        description={
                          <Space direction="vertical" size={4}>
                             <Text type="secondary">by {book.author}</Text>
                             <Space>
                               <Tag>{book.category}</Tag>
                               <Tag color="gold">★ {book.rating}</Tag>
                             </Space>
                          </Space>
                        }
                      />
                      {book.description && (
                        <Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ marginBottom: 0 }}>
                          {book.description}
                        </Paragraph>
                      )}
                    </List.Item>
                  )}
                />
              </div>
            )
          ) : (
            <EmptyState 
              title="No Books Found" 
              description="Try adjusting your search or filters to find what you're looking for." 
              actionText="Clear Filters"
              onAction={() => {
                setSearchText("");
                setSelectedCategories([]);
                setShowAvailableOnly(false);
              }}
            />
          )}
        </Content>
      </Layout>

      <Drawer
        title="Filter Books"
        placement="right"
        onClose={() => setFilterDrawerOpen(false)}
        open={filterDrawerOpen}
        width={320}
      >
        <FilterPanel mobile />
      </Drawer>

      <style jsx>{`
        .desktop-only-block {
          display: block !important;
        }
        @media (max-width: 992px) {
          .desktop-only-block {
            display: none !important;
          }
          .mobile-only-block {
            display: inline-flex !important;
          }
        }
      `}</style>
    </PageShell>
  );
};

const LoadingIcon = () => <Spin size="large" />;

export default SearchPage;
