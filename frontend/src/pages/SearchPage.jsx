import React, { useEffect, useState, useMemo } from "react";
import {
  Input,
  Button,
  message,
  Select,
  Typography,
  Pagination,
  Tag,
  Drawer,
  Space,
  Radio,
  Empty,
  Switch,
  Modal,
  AutoComplete,
  Card,
  Divider,
  Layout,
  Row,
  Col,
  Checkbox,
  theme,
  Grid
} from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  ArrowRightOutlined
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import EditorialPageShell from "../components/common/EditorialPageShell";
import MagazineBentoGrid from "../components/common/MagazineBentoGrid";
import EmptyStateIllustration from "../components/common/EmptyStateIllustration";
import BookCoverPro from "../components/common/BookCoverPro";
import { stringToWarmColor } from "../utils/hashColor";
import { getBooks, borrowBook, getBorrowedBooks, getUserRequestsLibrary } from "../api";
import { isBorrowLimitError, showBorrowLimitModal, extractErrorMessage } from "../utils/borrowUI";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const SearchPage = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const screens = useBreakpoint();
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
    const cat = params.get('category');
    
    if (q) setSearchText(q);
    if (sort) setSortBy(sort);
    if (cat) setSelectedCategories([cat]);
  }, [location.search]);

  // Derived Data
  const categories = useMemo(() => {
    const cats = new Set(books.map(b => b.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [books]);

  // ... (keep existing fetching logic)
  useEffect(() => {
    fetchBooks();
    fetchUserData();
  }, []);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await getBooks();
      setBooks(res.data);
      setFilteredBooks(res.data);
    } catch (error) {
      message.error("Failed to load books");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserData = async () => {
    // ... (keep existing user data fetching)
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) return;

    try {
      const [borrowedRes, requestsRes] = await Promise.allSettled([
        getBorrowedBooks(token),
        getUserRequestsLibrary(token)
      ]);

      if (borrowedRes.status === 'fulfilled') {
        setUserBorrowedBooks(new Set(borrowedRes.value.data.map(b => b.book_id)));
      }
      if (requestsRes.status === 'fulfilled') {
        setPendingRequests(new Set(requestsRes.value.data.filter(r => r.status === 'pending').map(r => r.book_id)));
      }
    } catch (error) {
      console.error("Error fetching user data", error);
    }
  };

  // Filter Logic
  useEffect(() => {
    let result = books;

    if (searchText) {
      const lower = searchText.toLowerCase();
      result = result.filter(b => 
        b.title.toLowerCase().includes(lower) || 
        b.author.toLowerCase().includes(lower) ||
        (b.isbn && b.isbn.includes(lower))
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter(b => selectedCategories.includes(b.category));
    }

    if (showAvailableOnly) {
      result = result.filter(b => b.available_copies > 0);
    }

    // Sort
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sortBy === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'author') {
      result.sort((a, b) => a.author.localeCompare(b.author));
    }

    setFilteredBooks(result);
  }, [books, searchText, selectedCategories, showAvailableOnly, sortBy]);


  // Handle Search
  const handleSearch = (value) => {
    setSearchText(value);
  };

  // Pagination
  const isMobile = !screens.md;
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = isMobile ? 8 : 12;
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const paginatedBooks = useMemo(() => filteredBooks.slice(pageStart, pageEnd), [filteredBooks, pageStart, pageEnd]);

  // Transform to Bento Grid Items (memoized)
  const bentoItems = useMemo(() => paginatedBooks.map((book, index) => {
    // Generate fallback cover if image missing
    const hasImage = !!book.cover_image;
    const coverNode = !hasImage ? (
      <BookCoverPro 
        title={book.title} 
        author={book.author} 
        width="100%" 
        height="100%" 
        style={index % 2 === 0 ? "swiss" : "serif"}
        baseColor={stringToWarmColor(book.title)}
      />
    ) : null;

    return {
      id: book.id || book._id, // Handle both id formats
      title: book.title,
      description: book.author,
      category: book.category || 'General',
      meta: book.available_copies > 0 ? `${book.available_copies} Available` : 'Out of Stock',
      coverImage: book.cover_image,
      coverNode: coverNode,
      action: (
        <Button 
          shape="circle" 
          icon={<ArrowRightOutlined />} 
          onClick={() => navigate(`/book/${book.id || book._id}`)}
        />
      ),
      // Standard grid for search results
      colSpan: 4, 
      rowSpan: 1,
      background: token.colorBgContainer
    };
  }), [paginatedBooks, navigate, token]);

  return (
    <EditorialPageShell 
      title="Search Library" 
      subtitle="Find your next read from our extensive collection."
      fullWidth
      headerAction={
        <Space>
           <Text>Showing {filteredBooks.length} results</Text>
        </Space>
      }
    >
      {contextHolder}
      
      {/* Search Strip */}
      <div style={{ 
        marginBottom: 48, 
        padding: screens.md ? '0 48px' : '0 16px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: token.colorBgLayout,
        backdropFilter: 'blur(10px)',
        paddingTop: 16,
        paddingBottom: 16,
        marginLeft: -24,
        marginRight: -24,
        borderBottom: `1px solid ${token.colorBorderSecondary}`
      }}>
        <div className="editorial-grid" style={{ alignItems: 'center' }}>
          <div className="col-span-8">
            <Input 
              size="large" 
              placeholder="Search by title, author, or ISBN..." 
              prefix={<SearchOutlined style={{ color: token.colorPrimary }} />} 
              bordered={false}
              style={{ 
                fontSize: 24, 
                fontFamily: "'Literata', serif",
                background: 'transparent',
                boxShadow: 'none'
              }}
              value={searchText}
              onChange={e => handleSearch(e.target.value)}
              allowClear
            />
          </div>
          <div className="col-span-4" style={{ textAlign: 'right' }}>
            <Space>
              <Select 
                defaultValue="newest" 
                style={{ width: 120 }} 
                bordered={false}
                onChange={setSortBy}
                options={[
                  { value: 'newest', label: 'Newest' },
                  { value: 'title', label: 'Title' },
                  { value: 'author', label: 'Author' },
                ]}
              />
              <Button 
                icon={<FilterOutlined />} 
                onClick={() => setFilterDrawerOpen(true)}
              >
                Filters
              </Button>
            </Space>
          </div>
        </div>
        
        {/* Quick Categories */}
        <div style={{ marginTop: 16, overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 8 }}>
          <Space>
            <Tag.CheckableTag 
              checked={selectedCategories.length === 0}
              onChange={() => setSelectedCategories([])}
              style={{ fontSize: 14, padding: '4px 12px' }}
            >
              All
            </Tag.CheckableTag>
            {categories.slice(0, 10).map(cat => (
              <Tag.CheckableTag
                key={cat}
                checked={selectedCategories.includes(cat)}
                onChange={(checked) => {
                  if (checked) setSelectedCategories([...selectedCategories, cat]);
                  else setSelectedCategories(selectedCategories.filter(c => c !== cat));
                }}
                style={{ fontSize: 14, padding: '4px 12px' }}
              >
                {cat}
              </Tag.CheckableTag>
            ))}
          </Space>
        </div>
      </div>

      {/* Results */}
      <div style={{ padding: screens.md ? '0 48px' : '0 16px' }}>
        {filteredBooks.length > 0 ? (
           <>
             <MagazineBentoGrid items={bentoItems} />
             <div style={{ textAlign: 'center', marginTop: 16, marginBottom: 24 }}>
               <Pagination 
                 current={currentPage} 
                 total={filteredBooks.length} 
                 pageSize={pageSize} 
                 onChange={setCurrentPage}
                 showSizeChanger={false}
               />
             </div>
           </>
        ) : (
          <EmptyStateIllustration 
            title="No books found" 
            description={`We couldn't find any matches for "${searchText}".`}
            action={<Button onClick={() => {setSearchText(''); setSelectedCategories([]);}}>Clear Filters</Button>}
          />
        )}
      </div>

      {/* Filter Drawer */}
      <Drawer
        title="Filter Books"
        placement="right"
        onClose={() => setFilterDrawerOpen(false)}
        open={filterDrawerOpen}
      >
        <div style={{ marginBottom: 24 }}>
          <Title level={5}>Availability</Title>
          <Switch 
            checked={showAvailableOnly} 
            onChange={setShowAvailableOnly} 
            checkedChildren="Available Only" 
            unCheckedChildren="All Books" 
          />
        </div>
        
        <div style={{ marginBottom: 24 }}>
          <Title level={5}>Categories</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            {categories.map(cat => (
              <Checkbox 
                key={cat}
                checked={selectedCategories.includes(cat)}
                onChange={(e) => {
                  if (e.target.checked) setSelectedCategories([...selectedCategories, cat]);
                  else setSelectedCategories(selectedCategories.filter(c => c !== cat));
                }}
              >
                {cat}
              </Checkbox>
            ))}
          </Space>
        </div>
      </Drawer>

    </EditorialPageShell>
  );
};

export default SearchPage;
