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
  Empty,
  Switch,
  Modal,
  Checkbox,
  theme,
  Grid,
  Spin
} from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  ArrowRightOutlined
} from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import EditorialPageShell from "../components/common/EditorialPageShell";
import MagazineBentoGrid from "../components/common/MagazineBentoGrid";
import EmptyStateIllustration from "../components/common/EmptyStateIllustration";
import BookCoverPro from "../components/common/BookCoverPro";
import { stringToWarmColor } from "../utils/hashColor";
import { getBooks } from "../api";
import { getCleanImageUrl } from "../utils/imageUtils";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

const SearchPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const [, contextHolder] = Modal.useModal();
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  
  // Filter States
  const [searchText, setSearchText] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  
  // UI States
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  
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

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await getBooks();
      setBooks(res.data);
      setFilteredBooks(res.data);
    } catch {
      message.error("Failed to load books");
    } finally {
      setLoading(false);
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
    const rawCover = book.coverImage || book.cover_image || "";
    const coverImageUrl = getCleanImageUrl(rawCover);
    const coverNode = (
      <BookCoverPro 
        title={book.title} 
        author={book.author} 
        width={180} 
        height={240} 
        style={index % 2 === 0 ? "swiss" : "serif"}
        baseColor={stringToWarmColor(book.title)}
      />
    );

    const availableCopies = book.available_copies ?? book.copies ?? 0;
    const totalCopies = book.total_copies ?? book.totalCopies ?? book.total ?? book.copies ?? undefined;

    return {
      id: book.id || book._id,
      title: book.title,
      description: book.author,
      category: book.category || 'General',
      meta: totalCopies !== undefined
        ? `stock: ${availableCopies}/${totalCopies}`
        : `stock: ${availableCopies}`,
      availableCopies,
      totalCopies,
      coverImage: coverImageUrl,
      coverNode,
      coverSrcSet: book.coverImageSet ? [
        book.coverImageSet.w160 ? `${book.coverImageSet.w160} 160w` : null,
        book.coverImageSet.w240 ? `${book.coverImageSet.w240} 240w` : null,
        book.coverImageSet.w360 ? `${book.coverImageSet.w360} 360w` : null,
      ].filter(Boolean).join(', ') : undefined,
      coverSizes: "(min-width: 992px) 200px, (min-width: 576px) 160px, 45vw",
      action: (
        <Space>
          <Button
            size="small"
            type="default"
            icon={<ArrowRightOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/book/${book.id || book._id}`);
            }}
          >
            View
          </Button>
        </Space>
      ),
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
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin />
          </div>
        ) : (
          <>
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
          </>
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

export const SearchLeftPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sortBy, setSortBy] = useState("newest");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || params.get('query');
    const sort = params.get('sort');
    const cat = params.get('category');
    const avail = params.get('avail');
    if (q) setSearchText(q);
    if (sort) setSortBy(sort);
    if (cat) setSelectedCategories([cat]);
    if (avail) setShowAvailableOnly(avail === '1');
  }, [location.search]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getBooks();
        if (!mounted) return;
        setBooks(res.data || []);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(books.map(b => b.category).filter(Boolean));
    return Array.from(cats).sort().slice(0, 12);
  }, [books]);

  const applyParams = (patch) => {
    const params = new URLSearchParams(location.search);
    if (typeof patch.q !== 'undefined') {
      if (patch.q) params.set('q', patch.q); else params.delete('q');
    }
    if (typeof patch.sort !== 'undefined') {
      if (patch.sort) params.set('sort', patch.sort); else params.delete('sort');
    }
    if (typeof patch.category !== 'undefined') {
      if (patch.category) params.set('category', patch.category); else params.delete('category');
    }
    if (typeof patch.avail !== 'undefined') {
      if (patch.avail) params.set('avail', '1'); else params.delete('avail');
    }
    navigate(`/search?${params.toString()}`, { replace: false });
  };

  return (
    <div style={{ padding: screens.md ? 24 : 12 }}>
      <div style={{ marginBottom: 24 }}>
        <Input
          size="large"
          placeholder="Search by title, author, or ISBN..."
          prefix={<SearchOutlined style={{ color: token.colorPrimary }} />}
          bordered
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onPressEnter={() => applyParams({ q: searchText })}
          allowClear
        />
        <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
          <Select
            value={sortBy}
            onChange={(v) => { setSortBy(v); applyParams({ sort: v }); }}
            style={{ width: 140 }}
            options={[
              { value: 'newest', label: 'Newest' },
              { value: 'title', label: 'Title' },
              { value: 'author', label: 'Author' },
            ]}
          />
          <Button onClick={() => { setFilterDrawerOpen(true); }}>Filters</Button>
        </div>
      </div>

      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <Space wrap size={[8, 8]}>
          <Tag.CheckableTag
            checked={selectedCategories.length === 0}
            onChange={() => { setSelectedCategories([]); applyParams({ category: "" }); }}
            style={{ fontSize: 13, padding: '4px 10px' }}
          >
            All
          </Tag.CheckableTag>
          {categories.map(cat => (
            <Tag.CheckableTag
              key={cat}
              checked={selectedCategories.includes(cat)}
              onChange={(checked) => {
                if (checked) {
                  setSelectedCategories([cat]);
                  applyParams({ category: cat });
                } else {
                  setSelectedCategories([]);
                  applyParams({ category: "" });
                }
              }}
              style={{ fontSize: 13, padding: '4px 10px' }}
            >
              {cat}
            </Tag.CheckableTag>
          ))}
        </Space>
      </div>

      <div style={{ marginTop: 16 }}>
        <Checkbox
          checked={showAvailableOnly}
          onChange={(e) => {
            setShowAvailableOnly(e.target.checked);
            applyParams({ avail: e.target.checked });
          }}
        >
          Available only
        </Checkbox>
      </div>

      <Drawer
        title="Filter Books"
        placement="right"
        onClose={() => setFilterDrawerOpen(false)}
        open={filterDrawerOpen}
      >
        <div style={{ marginBottom: 16 }}>
          <Title level={5}>Availability</Title>
          <Switch
            checked={showAvailableOnly}
            onChange={(v) => {
              setShowAvailableOnly(v);
              applyParams({ avail: v });
            }}
            checkedChildren="Available Only"
            unCheckedChildren="All Books"
          />
        </div>
        <div>
          <Title level={5}>Categories</Title>
          <Space direction="vertical" style={{ width: '100%' }}>
            {categories.map(cat => (
              <Checkbox
                key={cat}
                checked={selectedCategories.includes(cat)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedCategories([cat]);
                    applyParams({ category: cat });
                  } else {
                    setSelectedCategories([]);
                    applyParams({ category: "" });
                  }
                }}
              >
                {cat}
              </Checkbox>
            ))}
          </Space>
        </div>
      </Drawer>
    </div>
  );
};

export const SearchRightPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  const screens = useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);

  const params = new URLSearchParams(location.search);
  const qParam = params.get('q') || params.get('query') || "";
  const sortParam = params.get('sort') || "newest";
  const categoryParam = params.get('category') || "";
  const availableOnlyParam = params.get('avail') === '1';

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getBooks();
        if (!mounted) return;
        setBooks(res.data || []);
        setFilteredBooks(res.data || []);
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let result = books;
    if (qParam) {
      const lower = qParam.toLowerCase();
      result = result.filter(b =>
        (b.title || "").toLowerCase().includes(lower) ||
        (b.author || "").toLowerCase().includes(lower) ||
        (b.isbn && String(b.isbn).toLowerCase().includes(lower))
      );
    }
    if (categoryParam) {
      result = result.filter(b => (b.category || "") === categoryParam);
    }
    if (availableOnlyParam) {
      result = result.filter(b => (b.available_copies ?? b.copies ?? 0) > 0);
    }
    if (sortParam === 'newest') {
      result = [...result].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sortParam === 'title') {
      result = [...result].sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (sortParam === 'author') {
      result = [...result].sort((a, b) => (a.author || "").localeCompare(b.author || ""));
    }
    setFilteredBooks(result);
  }, [books, qParam, sortParam, categoryParam, availableOnlyParam]);

  const isMobile = !screens.md;
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = isMobile ? 8 : 12;
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const paginatedBooks = useMemo(() => filteredBooks.slice(pageStart, pageEnd), [filteredBooks, pageStart, pageEnd]);

  const bentoItems = useMemo(() => paginatedBooks.map((book, index) => {
    const rawCover = book.coverImage || book.cover_image || "";
    const coverImageUrl = getCleanImageUrl(rawCover);
    const coverNode = (
      <BookCoverPro 
        title={book.title} 
        author={book.author} 
        width={180} 
        height={240} 
        style={index % 2 === 0 ? "swiss" : "serif"}
        baseColor={stringToWarmColor(book.title)}
      />
    );
    const availableCopies = book.available_copies ?? book.copies ?? 0;
    const totalCopies = book.total_copies ?? book.totalCopies ?? book.total ?? book.copies ?? undefined;
    return {
      id: book.id || book._id,
      title: book.title,
      author: book.author,
      category: book.category || 'General',
      meta: totalCopies !== undefined
        ? `stock: ${availableCopies}/${totalCopies}`
        : `stock: ${availableCopies}`,
      coverNode,
      availableCopies,
      totalCopies,
    };
  }), [paginatedBooks, navigate, token]);

  return (
    <div style={{ padding: screens.md ? 24 : 12 }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin />
        </div>
      ) : (
        <>
          <div className="search-grid">
            {bentoItems.map((item) => (
              <div
                key={item.id}
                className="editorial-card book-card"
                style={{ width: "100%", cursor: "pointer" }}
                onClick={() => navigate(`/book/${item.id}`)}
              >
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr" }}>
                  <div className="book-card-cover" style={{ height: "100%" }}>
                    {item.coverNode}
                  </div>
                  <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 6 }}>
                    <Title level={5} style={{ margin: 0 }}>
                      {item.title}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {item.author}
                    </Text>
                    <Text style={{ fontSize: 12, opacity: 0.8 }}>
                      {item.category} · {item.meta}
                    </Text>
                    <div style={{ marginTop: "auto" }}>
                      <Button
                        size="small"
                        type="default"
                        icon={<ArrowRightOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/book/${item.id}`);
                        }}
                      >
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
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
      )}
    </div>
  );
};
