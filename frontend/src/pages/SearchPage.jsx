// ✅ client/src/pages/SearchPage.jsx
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
  Tabs,
  Tag,
  Drawer,
  Checkbox,
} from "antd";
import {
  SearchOutlined,
  BookOutlined,
  ReloadOutlined,
  FolderOpenOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  UserOutlined,
  CalendarOutlined,
  TagOutlined,
  FilterOutlined,
  MenuOutlined,
  SortAscendingOutlined,
} from "@ant-design/icons";
import { getBooks, borrowBook, getBorrowedBooks } from "../api"; // ✅ use unified API
import { requestRenewLibrary, requestReturnLibrary, getUserRequestsLibrary } from "../api.js";
import { isBorrowLimitError, showBorrowLimitModal, extractErrorMessage, showBorrowSuccessModal } from "../utils/borrowUI";
import { useLanguage } from "../contexts/LanguageContext"; // ✅ Added
import { Link } from "react-router-dom";
import BookGrid from "../components/BookGrid";
import EnhancedSearchBar from "../components/EnhancedSearchBar";
import { theme } from "../styles/theme";
import "./SearchPage.css";

const { Panel } = Collapse;
const { Title, Text } = Typography;
// const { useBreakpoint } = Grid; // ❌ Moved inside

function SearchPage() {
  const { language, t } = useLanguage();
  const { useBreakpoint } = Grid; // ✅ Moved here
  const screens = useBreakpoint();
  const isMobile = !screens.md; // <768px 视为移动端
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchType, setSearchType] = useState("title"); // 🔍 search mode
  const [viewMode, setViewMode] = useState("list"); // 📱 grid | list
  const [sortBy, setSortBy] = useState("latest");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(""); // Selected category for card view
  const [expandedCategories, setExpandedCategories] = useState(new Set()); // categories showing all books
  // Controlled modals for robust visibility
  const [limitOpen, setLimitOpen] = useState(false);
  const [successTitle, setSuccessTitle] = useState("");
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  const [userBorrowedBooks, setUserBorrowedBooks] = useState(new Set()); // User's borrowed books ID set
  const [userBorrowedBooksCount, setUserBorrowedBooksCount] = useState({}); // Count of each book borrowed by user
  const [borrowedInfo, setBorrowedInfo] = useState({}); // bookId -> { dueDate, daysLeft }
  const [pendingSet, setPendingSet] = useState(new Set()); // server pending bookIds
  const [localPendingSet, setLocalPendingSet] = useState(new Set()); // optimistic pending

  // Drawers state
  const [cateDrawerOpen, setCateDrawerOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  const stats = useMemo(() => {
    const total = books.length;
    const catCount = categories.length;
    const inStock = books.reduce((s, b) => s + (b.copies > 0 ? 1 : 0), 0);
    return { total, catCount, inStock };
  }, [books, categories]);

  /* =========================================================
     📚 Fetch books (with category grouping)
     ========================================================= */
  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await getBooks();
      let allBooks = res.data || [];

      // Apply default sort preference
      allBooks = sortBooks(allBooks, sortBy);

      // ✅ Auto group by category
      const grouped = allBooks.reduce((acc, book) => {
        const cat = book.category || t("search.uncategorized");
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(book);
        return acc;
      }, {});

      setBooks(allBooks);
      setCategories(
        Object.entries(grouped).map(([name, items]) => ({
          name,
          books: items,
        }))
      );

      // ✅ Fetch user's borrowed books if logged in
      if (token) {
        try {
          const borrowedRes = await getBorrowedBooks(token);
          const borrowedBooks = borrowedRes.data || [];
          const borrowedBookIds = new Set(borrowedBooks.map(item => item.bookId || item._id));
          
          // Count how many of each book the user has borrowed
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
          // ✅ also fetch user's requests to mark pending items
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
        } catch (borrowErr) {
          console.warn("Failed to fetch user's borrowed books:", borrowErr);
        }
      }
    } catch (err) {
      console.error("❌ Failed to fetch books:", err);
      message.error(t("search.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  /* =========================================================
     📘 Borrow book (with login check)
     ========================================================= */
  const handleBorrow = async (bookId, title, copies) => {
    if (!token) return message.warning(t("search.loginToBorrow"));
    
    // Check if user has already borrowed 2 copies of this book
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
      fetchBooks(); // ✅ refresh inventory after borrowing
    } catch (err) {
      console.error("❌ Borrow failed:", err);
      if (err?.__borrowLimit) {
        console.warn("🔴 Borrow limit flagged by interceptor", {
          url: err?.config?.url,
          status: err?.response?.status,
        });
        setLimitOpen(true);
        showBorrowLimitModal();
        return;
      }
      const backendMsg = extractErrorMessage(err);
      if (isBorrowLimitError(backendMsg)) {
        console.warn("🔴 Borrow limit matched by message", { backendMsg });
        setLimitOpen(true);
        showBorrowLimitModal();
        return;
      }
      // Fallback: detect by HTTP status and route
      const status = err?.response?.status;
      const url = err?.config?.url || "";
      if (status === 400 && url.includes("/library/borrow/")) {
        console.warn("🔴 Borrow limit fallback by status+route", { status, url });
        setLimitOpen(true);
        showBorrowLimitModal();
        return;
      }
      message.error(backendMsg || t("assistant.borrowFailed"));
    }
  };

  // Quick renew: extend by given days
  const handleRenew = async (bookId, days = 7) => {
    if (!token) return message.warning(t("search.loginToRenew"));
    try {
      setLocalPendingSet(prev => {
        const next = new Set(prev); next.add(String(bookId)); return next;
      });
      const payload = { type: "renew", bookId, days };
      await requestRenewLibrary(payload, token);
      message.success(t("search.renewSuccess", { days }));
      fetchBooks();
    } catch (err) {
      console.error("❌ Renew failed:", err);
      message.error(t("search.renewFailed"));
      setLocalPendingSet(prev => { const next = new Set(prev); next.delete(String(bookId)); return next; });
    }
  };

  const handleReturn = async (bookId) => {
    if (!token) return message.warning(t("search.loginToReturn"));
    try {
      setLocalPendingSet(prev => {
        const next = new Set(prev); next.add(String(bookId)); return next;
      });
      const payload = { type: "return", bookId };
      await requestReturnLibrary(payload, token);
      message.success(t("search.returnSuccess"));
      fetchBooks();
    } catch (err) {
      console.error("❌ Return failed:", err);
      message.error(t("search.returnFailed"));
      setLocalPendingSet(prev => { const next = new Set(prev); next.delete(String(bookId)); return next; });
    }
  };

  /* =========================================================
     🔍 Search (by title or author)
     ========================================================= */
  const handleSearch = (searchQuery, searchTypeValue = searchType) => {
    const searchText = searchQuery?.trim() || "";
    
    if (!searchText) {
      // If search is empty, show all books
      const grouped = books.reduce((acc, book) => {
        const cat = book.category || t("search.uncategorized");
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(book);
        return acc;
      }, {});

      setCategories(
        Object.entries(grouped).map(([name, items]) => ({
          name,
          books: items,
        }))
      );
      return;
    }

    let filtered = books.filter((b) => {
      const key = searchText.toLowerCase();
      switch (searchTypeValue) {
        case "title":
          return b.title?.toLowerCase().includes(key);
        case "author":
          return b.author?.toLowerCase().includes(key);
        case "category":
          return b.category?.toLowerCase().includes(key);
        default:
          return (
            b.title?.toLowerCase().includes(key) ||
            b.author?.toLowerCase().includes(key) ||
            b.category?.toLowerCase().includes(key)
          );
      }
    });

    // Sort by preference
    filtered = sortBooks(filtered, sortBy);

    if (filtered.length === 0) {
      message.warning(t("search.noResults"));
      return;
    }

    // ✅ Regroup
    const grouped = filtered.reduce((acc, b) => {
      const cat = b.category || t("search.uncategorized");
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(b);
      return acc;
    }, {});
    setCategories(
      Object.entries(grouped).map(([name, items]) => ({
        name,
        books: items,
      }))
    );
  };

  /* =========================================================
     🚀 Initial load
     ========================================================= */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("operation_prefs");
      if (raw) {
        const prefs = JSON.parse(raw);
        if (prefs.searchBy) setSearchType(prefs.searchBy);
        if (prefs.view) setViewMode(prefs.view);
        if (prefs.sortBy) setSortBy(prefs.sortBy);
        if (typeof prefs.showAdvanced === 'boolean') setShowAdvanced(prefs.showAdvanced);
      }
    } catch {}
    fetchBooks();
  }, []);

  useEffect(() => {
    // Re-sort when sortBy changes
    setBooks(prev => sortBooks(prev, sortBy));
  }, [sortBy]);

  const sortBooks = (arr, mode) => {
    const copy = Array.isArray(arr) ? [...arr] : [];
    switch (mode) {
      case "latest":
        return copy.sort((a, b) => (b.publishedYear || 0) - (a.publishedYear || 0));
      case "most_borrowed":
        return copy.sort((a, b) => (b.borrowedCount || 0) - (a.borrowedCount || 0));
      case "stock_high":
        return copy.sort((a, b) => (b.copies || 0) - (a.copies || 0));
      default:
        return copy;
    }
  };

  /* =========================================================
     📱 Render - Mobile View (Low Density Mode)
     ========================================================= */
  if (isMobile) {
    // Flatten books for mobile list if not using categories
    const allBooks = categories.reduce((acc, cat) => [...acc, ...cat.books], []);
    
    // Filter by selected category for mobile view if set
    const mobileDisplayBooks = selectedCategory 
      ? (categories.find(c => c.name === selectedCategory)?.books || [])
      : allBooks;

    return (
      <div className="mobile-low-density-view" style={{ padding: "16px", background: "#f8fafc", minHeight: "100vh" }}>
        {/* Controlled Modals */}
        <Modal open={!!successTitle} title={t("search.success")} onOk={() => setSuccessTitle("")} onCancel={() => setSuccessTitle("")} centered footer={null}>
           <div style={{ textAlign: 'center', padding: '20px' }}>
             <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎉</div>
             <h3>"{successTitle}" {t("search.borrowSuccess")}</h3>
             <Button type="primary" onClick={() => setSuccessTitle("")} block size="large" style={{ marginTop: '20px' }}>{t("common.close")}</Button>
           </div>
        </Modal>
        <Modal open={limitOpen} title={t("search.limitReached")} onOk={() => setLimitOpen(false)} onCancel={() => setLimitOpen(false)} centered footer={null}>
           <div style={{ padding: '10px' }}>
             <p>{t("search.limitReachedMsg")}</p>
             <Button type="primary" onClick={() => setLimitOpen(false)} block>{t("common.close")}</Button>
           </div>
        </Modal>

        {/* 📱 Mobile Drawers */}
        <Drawer
          title={t("search.category")}
          placement="bottom"
          height="60vh"
          onClose={() => setCateDrawerOpen(false)}
          open={cateDrawerOpen}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '16px 0' }}>
            <Tag 
              color={!selectedCategory ? "blue" : "default"} 
              onClick={() => { setSelectedCategory(""); setCateDrawerOpen(false); }}
              style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '20px', marginBottom: '8px' }}
            >
              {t("search.allBooks")}
            </Tag>
            {categories.map(cat => (
              <Tag 
                key={cat.name}
                color={selectedCategory === cat.name ? "blue" : "default"}
                onClick={() => { setSelectedCategory(cat.name); setCateDrawerOpen(false); }}
                style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '20px', marginBottom: '8px' }}
              >
                {cat.name} ({cat.books.length})
              </Tag>
            ))}
          </div>
        </Drawer>

        <Drawer
          title={t("search.filter")}
          placement="bottom"
          height="auto"
          onClose={() => setFilterDrawerOpen(false)}
          open={filterDrawerOpen}
        >
          <div style={{ marginBottom: "24px" }}>
            <Title level={5}>{t("search.sort")}</Title>
            <Select
              defaultValue="latest"
              size="large"
              style={{ width: "100%" }}
              onChange={(val) => { setSortBy(val); }}
              value={sortBy}
              options={[
                { label: t("search.latest"), value: "latest" },
                { label: t("search.popular"), value: "most_borrowed" },
                { label: t("search.inStock"), value: "stock_high" },
              ]}
            />
          </div>
          <Button type="primary" size="large" block onClick={() => setFilterDrawerOpen(false)}>{t("common.close")}</Button>
        </Drawer>

        {/* 🔍 Search Header */}
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
             <Title level={2} className="page-modern-title" style={{ margin: 0 }}>{t("search.title")}</Title>
             <div style={{ display: "flex", gap: "12px" }}>
                <Button 
                  icon={<AppstoreOutlined />} 
                  shape="circle" 
                  size="large"
                  onClick={() => setCateDrawerOpen(true)} 
                />
                <Button 
                  icon={<FilterOutlined />} 
                  shape="circle" 
                  size="large"
                  onClick={() => setFilterDrawerOpen(true)} 
                />
             </div>
          </div>
          
          {selectedCategory && (
            <div style={{ marginBottom: 16 }}>
               <Tag closable onClose={() => setSelectedCategory("")} color="blue" style={{ padding: '6px 12px', fontSize: 14, borderRadius: 16 }}>
                 {selectedCategory}
               </Tag>
            </div>
          )}

          <EnhancedSearchBar
            onSearch={handleSearch}
            searchType={searchType}
            onSearchTypeChange={setSearchType}
            onBorrow={handleBorrow}
            categoriesList={categories.map(c => c.name)}
            books={books}
            loading={loading}
            isMobile={true} 
          />
        </div>

        {/* 📚 Book List - Low Density Mode */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px" }}><Spin size="large" /></div>
        ) : (
          <div style={{ paddingBottom: "80px", display: "flex", flexDirection: "column", gap: "24px" }}>
            {mobileDisplayBooks.map(book => (
              <div key={book._id} className="mobile-card" style={{ 
                background: "#fff", 
                padding: "20px", 
                borderRadius: "20px",
                display: "flex", 
                alignItems: "center",
                boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
                position: "relative",
                width: "100%"
              }}>
                {/* Left: Info Area (Flexible) */}
                <div style={{ flex: 1, minWidth: 0, paddingRight: "16px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div className="text-clamp-2" style={{ fontSize: "18px", fontWeight: "700", color: "#1e293b", marginBottom: "8px", lineHeight: "1.4" }}>
                    {book.title}
                  </div>
                  <div className="text-clamp-1" style={{ fontSize: "15px", color: "#64748b", marginBottom: "12px" }}>
                    {book.author}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                     <Tag style={{ margin: 0, border: 'none', background: '#f1f5f9', color: '#64748b' }}>{book.publishedYear}</Tag>
                     <div style={{ fontSize: "13px", color: book.copies > 0 ? "#10b981" : "#ef4444", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: book.copies > 0 ? "#10b981" : "#ef4444" }}></div>
                        {book.copies > 0 ? `${book.copies} ${t("search.left")}` : t("search.out")}
                     </div>
                  </div>
                </div>

                {/* Right: Action Area (Fixed) */}
                <div style={{ width: "100px", flexShrink: 0 }}>
                  {userBorrowedBooks.has(book._id) ? (
                     <Button 
                       block 
                       disabled 
                       style={{ 
                         height: "44px", 
                         borderRadius: "14px", 
                         border: "none", 
                         background: "#f1f5f9", 
                         color: "#94a3b8",
                         fontWeight: 600
                       }}
                     >
                       {t("search.borrowedBtn")}
                     </Button>
                  ) : (
                     <Button 
                       type="primary" 
                       block 
                       disabled={book.copies <= 0}
                       onClick={(e) => { e.stopPropagation(); handleBorrow(book._id, book.title, book.copies); }}
                       style={{ 
                         height: "44px", 
                         borderRadius: "14px", 
                         fontSize: "15px", 
                         fontWeight: 600,
                         boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)"
                       }}
                     >
                       {t("search.borrowBtn")}
                     </Button>
                  )}
                </div>
              </div>
            ))}
            
            {mobileDisplayBooks.length === 0 && (
              <Empty description={t("search.noResults")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        )}
      </div>
    );
  }

  /* =========================================================
     🧱 Render - Desktop View
     ========================================================= */
  return (
    <div className="search-page" style={{ padding: "1.5rem" }}>
      {/* Controlled Success Modal to guarantee visibility */}
      <Modal
        open={!!successTitle}
        title={t("search.success")}
        onOk={() => setSuccessTitle("")}
        onCancel={() => setSuccessTitle("")}
        centered
        maskClosable
        getContainer={false}
        zIndex={10000}
        okText={t("common.confirm")}
        cancelText={t("common.cancel")}
      >
        <div>{t("search.borrowSuccess")}</div>
      </Modal>
      {/* Controlled Limit Modal to guarantee visibility */}
      <Modal
        open={limitOpen}
        title={t("search.limitReached")}
        onOk={() => setLimitOpen(false)}
        onCancel={() => setLimitOpen(false)}
        centered
        maskClosable
        getContainer={false}
        zIndex={10000}
        okText={t("common.confirm")}
        cancelText={t("common.cancel")}
      >
        <div>
          {t("search.limitReachedMsg")}
        </div>
      </Modal>
      <Card
        title={
          <div className="page-header">
            <Title level={2} className="page-modern-title" style={{ margin: "0 0 8px 0" }}>{t("search.title")}</Title>
            <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>{t("search.placeholder")}</Text>
            <div className="stats-grid">
              <Statistic title={t("common.total")} value={stats.total} />
              <Statistic title={t("search.category")} value={stats.catCount} />
              <Statistic title={t("search.inStock")} value={stats.inStock} valueStyle={{ color: "#52c41a" }} />
            </div>
          </div>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchBooks}
            style={{
              borderRadius: 6,
              background: "linear-gradient(90deg,#36cfc9,#1890ff)",
              color: "#fff",
            }}
          >
            {t("common.refresh")}
          </Button>
        }
        style={{
          borderRadius: "12px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        {/* 🔍 Enhanced Search */}
        {books && books.length > 0 ? (
          <EnhancedSearchBar
            onSearch={handleSearch}
            searchType={searchType}
            onSearchTypeChange={setSearchType}
            onBorrow={handleBorrow}
            onAddToCompare={(id) => {
              try {
                const raw = localStorage.getItem('compare_ids') || '[]';
                const arr = JSON.parse(raw);
                if (!arr.includes(id)) arr.push(id);
                localStorage.setItem('compare_ids', JSON.stringify(arr));
                message.success(t("assistant.compareUpdated"));
              } catch {}
            }}
            categoriesList={categories.map(c => c.name)}
            books={books}
            loading={loading}
          />
        ) : (
          // Fallback: simple search input
          <div style={{ marginBottom: "1rem" }}>
            <Input
              prefix={<SearchOutlined />}
              placeholder={t("search.placeholder")}
              onPressEnter={(e) => handleSearch(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        )}

        {/* 📱 View & Sort Preferences */}
        <div style={{ marginBottom: "1rem", textAlign: "center" }}>
          <Segmented
            value={viewMode}
            onChange={(value) => {
              setViewMode(value);
              // Don't auto-select category - let user choose
            }}
            options={[
              { 
                label: (
                  <span>
                    <AppstoreOutlined /> {t("search.cardView")}
                  </span>
                ), 
                value: "grid" 
              },
              { 
                label: (
                  <span>
                    <UnorderedListOutlined /> {t("search.listView")}
                  </span>
                ), 
                value: "list" 
              },
            ]}
          />
          <div style={{ marginTop: 12 }}>
            <Segmented
              value={sortBy}
              onChange={(v) => setSortBy(v)}
              options={[
                { label: t("search.latest"), value: "latest" },
                { label: t("search.popular"), value: "most_borrowed" },
                { label: t("search.inStock"), value: "stock_high" },
              ]}
            />
          </div>
          <div style={{ marginTop: 12 }}>
            <Button onClick={() => setShowAdvanced((s) => !s)}>
              {showAdvanced ? t("search.hideAdvanced") : t("search.showAdvanced")}
            </Button>
          </div>
        </div>

        {/* 📂 Category Selector for Card View */}
        {viewMode === "grid" && categories.length > 0 && (
          <div style={{ marginBottom: "1rem", textAlign: "center" }}>
            <div style={{ marginBottom: "8px", fontWeight: 500 }}>{t("search.selectCategory")}:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
              <Button
                key="all"
                type={!selectedCategory ? "primary" : "default"}
                onClick={() => setSelectedCategory("")}
                style={{ 
                  borderRadius: "20px",
                  background: !selectedCategory ? "linear-gradient(90deg,#36cfc9,#1890ff)" : undefined,
                  color: !selectedCategory ? "white" : undefined
                }}
              >
                {t("search.allCategories")} ({categories.reduce((sum, cat) => sum + cat.books.length, 0)})
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.name}
                  type={selectedCategory === cat.name ? "primary" : "default"}
                  onClick={() => setSelectedCategory(cat.name)}
                  style={{ 
                    borderRadius: "20px",
                    background: selectedCategory === cat.name ? "linear-gradient(90deg,#36cfc9,#1890ff)" : undefined,
                    color: selectedCategory === cat.name ? "white" : undefined
                  }}
                >
                  {cat.name} ({cat.books.length})
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* 🧰 Advanced Filters (List View) */}
        {showAdvanced && viewMode === "list" && (
          <div style={{ marginBottom: "1rem" }}>
            <Row gutter={[12, 12]}>
              <Col span={12}>
                <Select
                  allowClear
                  placeholder={t("search.filterByCategory")}
                  options={categories.map(c => ({ label: c.name, value: c.name }))}
                  style={{ width: "100%" }}
                  onChange={(val) => {
                    if (!val) {
                      setCategories(prev => prev); // no change
                      return;
                    }
                    const grouped = books.reduce((acc, b) => {
                      const cat = b.category || t("search.uncategorized");
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(b);
                      return acc;
                    }, {});
                    const selected = val && grouped[val] ? grouped[val] : [];
                    setCategories([{ name: val, books: selected }]);
                  }}
                />
              </Col>
              <Col span={12}>
                <Select
                  allowClear
                  placeholder={t("search.filterByYear")}
                  options={[
                    { label: "2024", value: 2024 },
                    { label: "2023", value: 2023 },
                    { label: "2022", value: 2022 },
                    { label: "2020", value: 2020 },
                  ]}
                  style={{ width: "100%" }}
                  onChange={(val) => {
                    const filtered = books.filter(b => (b.publishedYear || 0) >= (val || 0));
                    const grouped = filtered.reduce((acc, b) => {
                      const cat = b.category || t("search.uncategorized");
                      if (!acc[cat]) acc[cat] = [];
                      acc[cat].push(b);
                      return acc;
                    }, {});
                    setCategories(Object.entries(grouped).map(([name, items]) => ({ name, books: items })));
                  }}
                />
              </Col>
            </Row>
          </div>
        )}

        {/* 📚 Books display */}
        {loading ? (
          <Spin
            size="large"
            style={{ display: "block", margin: "2rem auto" }}
          />
        ) : categories.length === 0 ? (
          <Empty description={t("search.noResults")} />
        ) : (
          <>
            {viewMode === "grid" ? (
              // 📱 Card grid view - show only selected category
              <div className="books-grid-view">
                {categories
                  .filter(cat => !selectedCategory || cat.name === selectedCategory)
                  .map((cat) => (
                    <div key={cat.name} className="category-section">
                      <div className="category-header">
                        <Title
                          level={4}
                          style={{ margin: 0, color: theme.colors.primary.main, cursor: 'pointer' }}
                          onClick={() => {
                            // clicking category name shows all books in that category
                            setSelectedCategory(cat.name);
                            setExpandedCategories(prev => {
                              const next = new Set(prev);
                              next.add(cat.name);
                              return next;
                            });
                          }}
                        >
                          <FolderOpenOutlined /> {cat.name} ({cat.books.length})
                        </Title>
                      </div>
                      <BookGrid 
                        books={cat.books}
                        onBorrow={handleBorrow}
                        onRenew={handleRenew}
                        onReturn={handleReturn}
                        loading={loading}
                        userBorrowedBooks={userBorrowedBooks}
                        userBorrowedBooksCount={userBorrowedBooksCount}
                        borrowedInfo={borrowedInfo}
                        pendingBookIds={new Set([...
                          Array.from(pendingSet).map(String),
                          ...Array.from(localPendingSet).map(String)
                        ])}
                        showAll={expandedCategories.has(cat.name)}
                      />
                    </div>
                  ))}
              </div>
            ) : (
              // 📋 List view (original style)
              <Collapse accordion className="books-list-view">
                {categories.map((cat) => (
                  <Panel
                    key={cat.name}
                    header={
                      <span style={{ fontWeight: 600 }}>
                        <FolderOpenOutlined /> {cat.name} ({t("common.total")} {cat.books.length})
                      </span>
                    }
                  >
                    <List
                      dataSource={cat.books}
                      bordered
                      renderItem={(book) => (
                        <List.Item
                          actions={[
                            <Button
                              type="primary"
                              icon={<BookOutlined />}
                              disabled={book.copies <= 0 || userBorrowedBooks.has(book._id) || (userBorrowedBooksCount[book._id] || 0) >= 2}
                              onClick={() => handleBorrow(book._id, book.title, book.copies)}
                            >
                              {book.copies <= 0 ? t("search.outOfStock") : (userBorrowedBooksCount[book._id] || 0) >= 2 ? t("search.maxCopies") : userBorrowedBooks.has(book._id) ? t("search.borrowedBtn") : t("search.borrowBtn")}
                            </Button>,
                          ]}
                        >
                          <List.Item.Meta
                            title={
                              <Link to={`/book/${book._id}`} style={{ color: "#1677ff", fontWeight: 600 }}>
                                {book.title}
                              </Link>
                            }
                            description={
                              <div
                                className="book-meta-inline"
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: isMobile ? 8 : 14,
                                  marginTop: isMobile ? 6 : 4,
                                }}
                              >
                                <span>
                                  <UserOutlined style={{ color: '#8c8c8c', marginRight: 4 }} />
                                  {book.author || t("common.unknown")}
                                </span>
                                {book.category && (
                                  <span>
                                    <TagOutlined style={{ color: '#8c8c8c', marginRight: 4 }} />
                                    <Tag 
                                      color="#1677ff"
                                      style={{ margin: 0, fontSize: '12px' }}
                                    >
                                      {book.category}
                                    </Tag>
                                  </span>
                                )}
                                {book.publishedYear && (
                                  <span>
                                    <CalendarOutlined style={{ color: '#8c8c8c', marginRight: 4 }} />
                                    {book.publishedYear}
                                  </span>
                                )}
                                <span>
                                  <BookOutlined style={{ color: '#8c8c8c', marginRight: 4 }} />
                                  {t("search.availableCopies").replace("{count}", book.copies || 0)}
                                </span>
                              </div>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  </Panel>
                ))}
              </Collapse>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

export default SearchPage;