/**
 * Search Page
 * Features a dual-panel "Book World" layout with metadata-based deduplication and stock aggregation.
 */
import React, { useEffect, useState, useMemo, useRef } from "react";
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

let leftScrollContainer = null;
let rightScrollContainer = null;
let isSyncingScroll = false;

const useSyncedScroll = (side) => {
  const rootRef = useRef(null);

  useEffect(() => {
    if (!rootRef.current) return;
    const scrollEl = rootRef.current.closest(".bw-scroll");
    if (!scrollEl) return;

    if (side === "left") {
      leftScrollContainer = scrollEl;
    } else {
      rightScrollContainer = scrollEl;
    }

    const handleScroll = () => {
      if (isSyncingScroll) return;
      const target =
        side === "left" ? rightScrollContainer : leftScrollContainer;
      if (!target) return;
      isSyncingScroll = true;
      target.scrollTop = scrollEl.scrollTop;
      isSyncingScroll = false;
    };

    scrollEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      scrollEl.removeEventListener("scroll", handleScroll);
    };
  }, [side]);

  return rootRef;
};

// Compute stock consistently across all views
const computeStock = (b) => {
  const firstNum = (...vals) => {
    for (const v of vals) {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  };
  const available = firstNum(
    b?.available_copies,
    b?.availableCopies,
    b?.available,
    b?.stockAvailable,
    b?.copies
  );
  const total = firstNum(
    b?.total_copies,
    b?.totalCopies,
    b?.total,
    b?.copies
  );
  return {
    available: available ?? 0,
    total
  };
};

const normalizeText = (value) => {
  if (!value) return "";
  const s = String(value);
  const normalized = s.normalize ? s.normalize("NFKC") : s;
  return normalized
    .toLowerCase()
    .replace(/[\s\u00A0]+/g, " ")
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
    .trim();
};

const mergeDuplicateBooks = (books) => {
  if (!Array.isArray(books)) return [];
  const map = new Map();
  const standalone = [];
  const toNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const normalizeCover = (book) => {
    const raw =
      book.coverImage || book.cover_image || book.cover || "";
    if (!raw) return "";
    const cleaned = getCleanImageUrl(raw) || raw;
    const base = cleaned.split("?")[0];
    return base.toLowerCase();
  };

  const buildKey = (book) => {
    const rawIsbn = typeof book.isbn === "string" ? book.isbn.trim() : "";
    if (rawIsbn) return `isbn:${rawIsbn}`;
    const title = normalizeText(book.title);
    const author = normalizeText(book.author);
    if (title && author) return `ta:${title}|${author}`;
    const cover = normalizeCover(book);
    if (cover && author) return `ca:${cover}|${author}`;
    return null;
  };

  const applyStockAggregation = (target, book) => {
    const { available, total } = computeStock(book);
    const prevAvail = toNumber(target._aggAvailable);
    const prevTotal = toNumber(target._aggTotal);
    const nextAvail = prevAvail + toNumber(available);
    const nextTotal = prevTotal + toNumber(total);
    target._aggAvailable = nextAvail;
    target._aggTotal = nextTotal;
    target.available_copies = nextAvail;
    target.total_copies = nextTotal;
    target.copies = nextAvail;
    target.totalCopies = nextTotal;
  };

  for (const book of books) {
    if (!book) continue;
    const key = buildKey(book);
    if (!key) {
      standalone.push(book);
      continue;
    }
    const existing = map.get(key);
    if (!existing) {
      const base = { ...book };
      applyStockAggregation(base, book);
      map.set(key, base);
      continue;
    }
    const merged = existing;
    applyStockAggregation(merged, book);
    const borrowCountA = toNumber(merged.borrowCount);
    const borrowCountB = toNumber(book.borrowCount);
    merged.borrowCount = borrowCountA + borrowCountB;
    const tagsA = Array.isArray(merged.tags) ? merged.tags : [];
    const tagsB = Array.isArray(book.tags) ? book.tags : [];
    merged.tags = Array.from(new Set([...tagsA, ...tagsB]));
    const keywordsA = Array.isArray(merged.keywords) ? merged.keywords : [];
    const keywordsB = Array.isArray(book.keywords) ? book.keywords : [];
    merged.keywords = Array.from(new Set([...keywordsA, ...keywordsB]));
    if (!merged.coverImage && book.coverImage) merged.coverImage = book.coverImage;
    if (!merged.coverImageSet && book.coverImageSet) merged.coverImageSet = book.coverImageSet;
    if (!merged.publisher && book.publisher) merged.publisher = book.publisher;
    if (!merged.publishDate && book.publishDate) merged.publishDate = book.publishDate;
    map.set(key, merged);
  }
  return [...standalone, ...map.values()];
};

const filterAndSortBooksFromParams = (books, params) => {
  let result = books || [];

  const qParam = params.get("q") || params.get("query") || "";
  const sortParam = params.get("sort") || "newest";
  const categoryParam = params.get("category") || "";
  const availableOnlyParam = params.get("avail") === "1";

  if (qParam) {
    const lower = qParam.toLowerCase();
    result = result.filter((b) => {
      const title = (b.title || "").toLowerCase();
      const author = (b.author || "").toLowerCase();
      const isbn = b.isbn ? String(b.isbn).toLowerCase() : "";
      return (
        title.includes(lower) || author.includes(lower) || isbn.includes(lower)
      );
    });
  }

  if (categoryParam) {
    result = result.filter(
      (b) => (b.category || "") === categoryParam
    );
  }

  if (availableOnlyParam) {
    result = result.filter((b) => {
      const { available } = computeStock(b);
      return available > 0;
    });
  }

  if (sortParam === "newest") {
    result = [...result].sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime()
    );
  } else if (sortParam === "title") {
    result = [...result].sort((a, b) =>
      (a.title || "").localeCompare(b.title || "")
    );
  } else if (sortParam === "author") {
    result = [...result].sort((a, b) =>
      (a.author || "").localeCompare(b.author || "")
    );
  }

  return result;
};

const splitBooksEvenOdd = (books) => {
  const left = [];
  const right = [];
  books.forEach((b, index) => {
    if (index % 2 === 0) left.push(b);
    else right.push(b);
  });
  return { left, right };
};

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
      const data = res.data || [];
      const deduped = mergeDuplicateBooks(data);
      setBooks(deduped);
      setFilteredBooks(deduped);
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
    const rawCover = book.coverImage || book.cover_image || book.cover || "";
    const coverImageUrl = getCleanImageUrl(rawCover);
    const { available, total } = computeStock(book);
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

    const availableCopies = available;
    const totalCopies = total;

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
  }), [paginatedBooks, navigate, token.colorBgContainer]);

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
  const [, setSortBy] = useState("newest");
  const [, setShowAvailableOnly] = useState(false);
  const rootRef = useSyncedScroll("left");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get("q") || params.get("query") || "";
    const sort = params.get("sort") || "newest";
    const cat = params.get("category") || "";
    const avail = params.get("avail") === "1";
    setSearchText(q);
    setSortBy(sort);
    setSelectedCategories(cat ? [cat] : []);
    setShowAvailableOnly(avail);
  }, [location.search]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      try {
        const res = await getBooks();
        if (!mounted) return;
        const data = res.data || [];
        const deduped = mergeDuplicateBooks(data);
        setBooks(deduped);
      } catch (e) {
        void e;
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredBooks = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return filterAndSortBooksFromParams(books, params);
  }, [books, location.search]);

  const { left: leftBooks } = useMemo(
    () => splitBooksEvenOdd(filteredBooks),
    [filteredBooks]
  );

  const categories = useMemo(() => {
    const cats = new Set(books.map((b) => b.category).filter(Boolean));
    return Array.from(cats).sort().slice(0, 12);
  }, [books]);

  const applyParams = (patch) => {
    const next = new URLSearchParams(location.search);
    if (Object.prototype.hasOwnProperty.call(patch, "q")) {
      if (patch.q) next.set("q", patch.q);
      else next.delete("q");
    }
    if (Object.prototype.hasOwnProperty.call(patch, "sort")) {
      if (patch.sort) next.set("sort", patch.sort);
      else next.delete("sort");
    }
    if (Object.prototype.hasOwnProperty.call(patch, "category")) {
      if (patch.category) next.set("category", patch.category);
      else next.delete("category");
    }
    if (Object.prototype.hasOwnProperty.call(patch, "avail")) {
      if (patch.avail) next.set("avail", "1");
      else next.delete("avail");
    }
    navigate(`/search?${next.toString()}`, { replace: false });
  };

  return (
    <div
      ref={rootRef}
      style={{
        padding: screens.md ? 24 : 12,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 16
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: screens.md ? "16px 16px 12px" : "12px 8px 10px",
          marginLeft: screens.md ? -24 : -12,
          marginRight: screens.md ? -24 : -12,
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${token.colorBorderSecondary}`
        }}
      >
        <Input
          size="large"
          placeholder="Search by title, author, or ISBN..."
          prefix={<SearchOutlined style={{ color: token.colorPrimary }} />}
          bordered={false}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          onPressEnter={() => applyParams({ q: searchText })}
          allowClear
          style={{
            fontSize: 22,
            fontFamily: "'Literata', serif",
            background: "transparent",
            boxShadow: "none"
          }}
        />
      </div>

      <div style={{ marginTop: 8, marginBottom: 16 }}>
        <Space wrap size={[8, 8]}>
          <Tag.CheckableTag
            checked={selectedCategories.length === 0}
            onChange={() => {
              setSelectedCategories([]);
              applyParams({ category: "" });
            }}
            style={{ fontSize: 13, padding: "4px 10px" }}
          >
            All
          </Tag.CheckableTag>
          {categories.map((cat) => (
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
              style={{ fontSize: 13, padding: "4px 10px" }}
            >
              {cat}
            </Tag.CheckableTag>
          ))}
        </Space>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <Spin />
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16
          }}
        >
          {leftBooks.map((book, index) => {
            const rawCover = book.coverImage || book.cover_image || book.cover || "";
            const coverImageUrl = getCleanImageUrl(rawCover);
            const { available, total } = computeStock(book);
            const availableCopies = available;
            const totalCopies = total;
            return (
              <div
                key={book.id || book._id || index}
                className="editorial-card book-card"
                style={{ width: "100%", cursor: "pointer" }}
                onClick={() => navigate(`/book/${book.id || book._id}`)}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "88px 1fr",
                    alignItems: "stretch",
                    gap: 12,
                    padding: 16
                  }}
                >
                  <div
                    className="book-card-cover"
                    style={{
                      position: "relative",
                      height: "100%",
                      overflow: "hidden",
                      borderRadius: 4
                    }}
                  >
                    <div style={{ position: "absolute", inset: 0 }} aria-hidden="true">
                      <BookCoverPro
                        title={book.title}
                        author={book.author}
                        width={72}
                        height={108}
                        style={index % 2 === 0 ? "swiss" : "serif"}
                        baseColor={stringToWarmColor(book.title)}
                      />
                    </div>
                    {coverImageUrl ? (
                      <img
                        src={coverImageUrl}
                        alt={book.title}
                        loading="lazy"
                        decoding="async"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center",
                          display: "block",
                          position: "relative",
                          zIndex: 1
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 6
                    }}
                  >
                    <Title level={5} style={{ margin: 0 }}>
                      {book.title}
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {book.author}
                    </Text>
                    <Text style={{ fontSize: 12, opacity: 0.8 }}>
                      {(book.category || "General") +
                        " · " +
                        (totalCopies !== undefined
                          ? `stock: ${availableCopies}/${totalCopies}`
                          : `stock: ${availableCopies}`)}
                    </Text>
                  </div>
                </div>
              </div>
            );
          })}
          {leftBooks.length === 0 && !loading && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No books on this side for current filters."
            />
          )}
        </div>
      )}
    </div>
  );
};

export const SearchRightPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const screens = useBreakpoint();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const rootRef = useSyncedScroll("right");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const sort = params.get("sort") || "newest";
    const avail = params.get("avail") === "1";
    setSortBy(sort);
    setShowAvailableOnly(avail);
  }, [location.search]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getBooks();
        if (!mounted) return;
        const data = res.data || [];
        const deduped = mergeDuplicateBooks(data);
        setBooks(deduped);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredBooks = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return filterAndSortBooksFromParams(books, params);
  }, [books, location.search]);

  const { right: rightBooks } = useMemo(
    () => splitBooksEvenOdd(filteredBooks),
    [filteredBooks]
  );

  const isMobile = !screens.md;
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = isMobile ? 8 : 12;
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const paginatedBooks = useMemo(
    () => rightBooks.slice(pageStart, pageEnd),
    [rightBooks, pageStart, pageEnd]
  );

  const applyParams = (patch) => {
    const next = new URLSearchParams(location.search);
    if (Object.prototype.hasOwnProperty.call(patch, "sort")) {
      if (patch.sort) next.set("sort", patch.sort);
      else next.delete("sort");
    }
    if (Object.prototype.hasOwnProperty.call(patch, "avail")) {
      if (patch.avail) next.set("avail", "1");
      else next.delete("avail");
    }
    navigate(`/search?${next.toString()}`, { replace: false });
  };

  const bentoItems = useMemo(() => paginatedBooks.map((book, index) => {
    const rawCover = book.coverImage || book.cover_image || book.cover || "";
    const coverImage = getCleanImageUrl(rawCover);
    const coverImageSet = book.coverImageSet;
    const coverSrcSet = coverImageSet
      ? [
          coverImageSet.w160 ? `${coverImageSet.w160} 160w` : null,
          coverImageSet.w240 ? `${coverImageSet.w240} 240w` : null,
          coverImageSet.w360 ? `${coverImageSet.w360} 360w` : null
        ]
          .filter(Boolean)
          .join(", ")
      : undefined;
    const coverSizes =
      "(min-width: 992px) 160px, (min-width: 576px) 120px, 40vw";
    const { available, total } = computeStock(book);
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
    const availableCopies = available;
    const totalCopies = total;
    return {
      id: book.id || book._id,
      title: book.title,
      author: book.author,
      category: book.category || "General",
      meta:
        totalCopies !== undefined
          ? `stock: ${availableCopies}/${totalCopies}`
          : `stock: ${availableCopies}`,
      coverNode,
      coverImage,
      coverSrcSet,
      coverSizes,
      availableCopies,
      totalCopies
    };
  }), [paginatedBooks]);

  return (
    <div
      ref={rootRef}
      style={{
        padding: screens.md ? 24 : 12,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: 16
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          padding: screens.md ? "16px 16px 12px" : "12px 8px 10px",
          marginLeft: screens.md ? -24 : -12,
          marginRight: screens.md ? -24 : -12,
          background: "rgba(255,255,255,0.82)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(0,0,0,0.06)"
        }}
      >
        <Space
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <Select
            value={sortBy}
            onChange={(v) => {
              setSortBy(v);
              applyParams({ sort: v });
            }}
            style={{ width: 160 }}
            options={[
              { value: "newest", label: "Newest" },
              { value: "title", label: "Title" },
              { value: "author", label: "Author" }
            ]}
          />
          <Space>
            <Checkbox
              checked={showAvailableOnly}
              onChange={(e) => {
                setShowAvailableOnly(e.target.checked);
                applyParams({ avail: e.target.checked });
              }}
            >
              Available only
            </Checkbox>
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                Modal.info({
                  title: "Filters",
                  content: "Use left page categories and this toggle to refine."
                });
              }}
            >
              Filters
            </Button>
          </Space>
        </Space>
      </div>

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
                style={{ width: "100%", cursor: "pointer", display: "flex", flexDirection: "column" }}
                onClick={() => navigate(`/book/${item.id}`)}
              >
                <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                  <div
                    className="book-card-cover"
                    style={{
                      position: "relative",
                      paddingTop: "150%",
                      overflow: "hidden",
                      borderRadius: 12
                    }}
                  >
                    <div
                      style={{ position: "absolute", inset: 0 }}
                      aria-hidden="true"
                    >
                      {item.coverNode}
                    </div>
                    {item.coverImage ? (
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        srcSet={item.coverSrcSet || undefined}
                        sizes={item.coverSizes || undefined}
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center",
                          display: "block",
                          zIndex: 1
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                  </div>
                  <div
                    style={{
                      padding: 14,
                      paddingTop: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      flex: 1
                    }}
                  >
                    <Text
                      strong
                      ellipsis={{ rows: 2 }}
                      style={{ fontSize: 14, lineHeight: 1.4 }}
                    >
                      {item.title}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
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
          <div style={{ textAlign: "center", marginTop: 16, marginBottom: 24 }}>
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
