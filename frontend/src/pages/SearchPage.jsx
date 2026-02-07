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
  Switch
} from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  AppstoreOutlined,
  BarsOutlined,
  SortAscendingOutlined,
  ReloadOutlined
} from "@ant-design/icons";
import { useLanguage } from "../contexts/LanguageContext";
import PageContainer from "../components/common/PageContainer";
import PageHeader from "../components/common/PageHeader";
import ModernBookCard from "../components/common/ModernBookCard";
import { getBooks, borrowBook, getBorrowedBooks, getUserRequestsLibrary } from "../api";
import { isBorrowLimitError, showBorrowLimitModal, extractErrorMessage, showBorrowSuccessModal } from "../utils/borrowUI";

const { Title, Text } = Typography;
const { Search } = Input;

const SearchPage = () => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  
  // Filters
  const [searchText, setSearchText] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  
  // UI State
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  
  // User State for Borrow Logic
  const [userBorrowedBooks, setUserBorrowedBooks] = useState(new Set());
  const [pendingRequests, setPendingRequests] = useState(new Set());
  
  // Derived Data
  const categories = useMemo(() => {
    const cats = new Set(books.map(b => b.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [books]);

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
      const [booksRes, borrowedRes, requestsRes] = await Promise.allSettled([
        getBooks(),
        getBorrowedBooks(token),
        getUserRequestsLibrary(token)
      ]);

      if (booksRes.status === 'fulfilled') {
        setBooks(booksRes.value.data);
      }
      
      if (borrowedRes.status === 'fulfilled') {
        const borrowedIds = new Set(borrowedRes.value.data.map(b => b._id || b.id));
        setUserBorrowedBooks(borrowedIds);
      }

      if (requestsRes.status === 'fulfilled') {
         const pendingIds = new Set(requestsRes.value.data.filter(r => r.status === 'pending').map(r => r.bookId));
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

    // Text Search
    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(b => 
        b.title.toLowerCase().includes(lower) || 
        b.author.toLowerCase().includes(lower) ||
        b.isbn?.includes(lower)
      );
    }

    // Category Filter
    if (selectedCategories.length > 0) {
      result = result.filter(b => selectedCategories.includes(b.category));
    }

    // Availability Filter
    if (showAvailableOnly) {
      result = result.filter(b => b.copies > 0);
    }

    // Sorting
    switch (sortBy) {
      case "newest":
        // Assuming _id roughly correlates to creation or if there's a date field
        result.sort((a, b) => (b._id || "").localeCompare(a._id || "")); 
        break;
      case "title":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "author":
        result.sort((a, b) => a.author.localeCompare(b.author));
        break;
      case "popular":
        // Mock logic if borrowCount not available
        result.sort((a, b) => (b.copies < 5 ? 1 : -1)); 
        break;
      default:
        break;
    }

    setFilteredBooks(result);
  };

  const handleBorrow = async (bookId, title, copies) => {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
      message.warning(t("common.loginFirst"));
      return;
    }
    
    try {
      await borrowBook(bookId, token);
      showBorrowSuccessModal(title, "Due in 30 days");
      fetchData(); // Refresh state
    } catch (error) {
      if (isBorrowLimitError(error)) {
        showBorrowLimitModal();
      } else {
        message.error(extractErrorMessage(error));
      }
    }
  };

  const FilterPanel = () => (
    <div style={{ padding: '0 8px' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={5} style={{ marginBottom: 12 }}>Availability</Title>
        <Space>
           <Switch checked={showAvailableOnly} onChange={setShowAvailableOnly} />
           <Text>In Stock Only</Text>
        </Space>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Title level={5} style={{ marginBottom: 12 }}>Categories</Title>
        <Checkbox.Group 
          options={categories.map(c => ({ label: c || "Uncategorized", value: c }))} 
          value={selectedCategories}
          onChange={setSelectedCategories}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        />
      </div>
      
      <Button block icon={<ReloadOutlined />} onClick={() => {
        setSearchText("");
        setSelectedCategories([]);
        setShowAvailableOnly(false);
        setSortBy("newest");
      }}>
        Reset Filters
      </Button>
    </div>
  );

  return (
    <PageContainer>
      <PageHeader 
        title="Browse Library"
        subtitle="Find your next great read."
        extra={
          <Button 
            icon={<FilterOutlined />} 
            onClick={() => setFilterDrawerOpen(true)}
            className="mobile-filter-btn" // Hide on desktop via CSS
            style={{ display: 'none' }} 
          >
            Filters
          </Button>
        }
      />

      <Row gutter={[32, 32]}>
        {/* Sidebar Filters - Desktop */}
        <Col xs={0} md={6}>
           <div className="card-shadow" style={{ background: '#fff', padding: 24, borderRadius: 14, position: 'sticky', top: 88 }}>
             <FilterPanel />
           </div>
        </Col>

        {/* Main Content */}
        <Col xs={24} md={18}>
          {/* Search & Sort Bar */}
          <div style={{ marginBottom: 24, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <Input 
              placeholder="Search by title, author, or ISBN..." 
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              size="large"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              allowClear
              style={{ flex: 1, minWidth: 280, borderRadius: 8 }}
            />
            
            <Select 
              value={sortBy} 
              onChange={setSortBy} 
              size="large"
              style={{ width: 160 }}
              options={[
                { label: "Newest Arrivals", value: "newest" },
                { label: "Title (A-Z)", value: "title" },
                { label: "Author (A-Z)", value: "author" },
                // { label: "Popularity", value: "popular" },
              ]}
            />
            
            <Radio.Group value={viewMode} onChange={e => setViewMode(e.target.value)} size="large">
              <Radio.Button value="grid"><AppstoreOutlined /></Radio.Button>
              <Radio.Button value="list"><BarsOutlined /></Radio.Button>
            </Radio.Group>
          </div>

          {/* Results Info */}
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
            <Text strong>{filteredBooks.length} results found</Text>
            {(searchText || selectedCategories.length > 0) && (
              <Tag color="blue" closable onClose={() => { setSearchText(""); setSelectedCategories([]); }}>
                Clear Filters
              </Tag>
            )}
          </div>

          {/* Book List/Grid */}
          {loading ? (
             <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Loading books..." />
          ) : filteredBooks.length > 0 ? (
            viewMode === 'grid' ? (
              <Row gutter={[16, 16]}>
                {filteredBooks.map(book => (
                  <Col xs={12} sm={12} lg={8} xl={6} key={book._id || book.id}>
                    <ModernBookCard 
                      book={book} 
                      variant="search"
                      onBorrow={handleBorrow}
                      isBorrowed={userBorrowedBooks.has(book._id || book.id)}
                      isPending={pendingRequests.has(book._id || book.id)}
                    />
                  </Col>
                ))}
              </Row>
            ) : (
              <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden' }} className="card-shadow">
                <List
                  itemLayout="horizontal"
                  dataSource={filteredBooks}
                  renderItem={(book) => (
                    <List.Item 
                      actions={[
                        <Button 
                          type="primary" 
                          disabled={book.copies <= 0 || userBorrowedBooks.has(book._id || book.id)}
                          onClick={() => handleBorrow(book._id || book.id, book.title, book.copies)}
                        >
                          {book.copies <= 0 ? "Out of Stock" : userBorrowedBooks.has(book._id || book.id) ? "Borrowed" : "Borrow"}
                        </Button>
                      ]}
                      style={{ padding: 16 }}
                    >
                      <List.Item.Meta
                        avatar={<div style={{ width: 48, height: 64, background: '#f0f0f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BookOutlined /></div>}
                        title={<Text strong>{book.title}</Text>}
                        description={
                          <Space direction="vertical" size={0}>
                             <Text type="secondary">by {book.author}</Text>
                             <Tag>{book.category}</Tag>
                          </Space>
                        }
                      />
                      <div style={{ marginRight: 24 }}>
                        <Text type={book.copies > 0 ? "success" : "danger"}>
                          {book.copies > 0 ? `${book.copies} available` : "Out of stock"}
                        </Text>
                      </div>
                    </List.Item>
                  )}
                />
              </div>
            )
          ) : (
            <Empty description="No books found matching your criteria" />
          )}
        </Col>
      </Row>

      {/* Mobile Filter Drawer */}
      <Drawer
        title="Filter Books"
        placement="right"
        onClose={() => setFilterDrawerOpen(false)}
        open={filterDrawerOpen}
        width={280}
      >
        <FilterPanel />
      </Drawer>
      
      <style jsx>{`
        @media (max-width: 768px) {
          .mobile-filter-btn {
            display: inline-flex !important;
          }
        }
      `}</style>
    </PageContainer>
  );
};

export default SearchPage;
