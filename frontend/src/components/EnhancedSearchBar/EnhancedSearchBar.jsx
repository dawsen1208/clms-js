// ✅ Enhanced search bar component (autocomplete + highlight matching)
import { useState, useEffect, useMemo } from "react";
import { AutoComplete, Input, Typography, Button, Tooltip, Tag } from "antd";
import { SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import { theme } from "../../styles/theme";
import { useLanguage } from "../../contexts/LanguageContext";
import "./EnhancedSearchBar.css";

const { Search } = Input;
const { Text } = Typography;

function EnhancedSearchBar({ 
  onSearch, 
  searchType, 
  onSearchTypeChange, 
  onRefresh,
  onBorrow,
  onAddToCompare,
  categoriesList = [],
  books = [],
  loading = false 
}) {
  const { t } = useLanguage();
  const [searchValue, setSearchValue] = useState("");
  const [options, setOptions] = useState([]);
  const [error, setError] = useState(null);

  // Safe highlight matching function
  const highlightMatch = (text, query) => {
    try {
      if (!text || !query) return text;
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedQuery})`, 'gi');
      return text.replace(regex, '<span class="highlight">$1</span>');
    } catch (e) {
      console.error('Highlight error:', e);
      return text;
    }
  };

  // Generate search suggestions
  const generateOptions = useMemo(() => {
    try {
      if (!searchValue || searchValue.length < 2 || !books || !Array.isArray(books)) return [];

      const suggestions = [];
      const searchLower = searchValue.toLowerCase();

      // 按搜索类型过滤和建议
      books.forEach((book, index) => {
        if (!book || typeof book !== 'object') return;
        
        let matchText = "";
        let field = "";

        switch (searchType) {
          case "title":
            matchText = book.title || "";
            break;
          case "author":
            matchText = book.author || "";
            break;
          case "category":
            matchText = book.category || "";
            break;
          default:
            matchText = `${book.title || ''} ${book.author || ''} ${book.category || ''}`;
        }

        if (matchText && matchText.toLowerCase().includes(searchLower)) {
          // 安全地高亮匹配的文本
          const highlightedText = highlightMatch(matchText, searchValue);
          
          suggestions.push({
            value: matchText,
            label: (
              <div className="search-suggestion-item" key={`suggestion-${index}`}>
                <div 
                  className="suggestion-title" 
                  dangerouslySetInnerHTML={{ __html: highlightedText }} 
                />
                <div className="suggestion-meta">
                  {(book.title || t("common.unknown"))} · {(book.author || t("common.unknown"))} · {t("search.available", { count: book.copies || 0 })}
                </div>
                <div className="suggestion-actions">
                  <Button
                    size="small"
                    type="primary"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => { e.stopPropagation(); onBorrow && onBorrow(book._id || book.id, book.title, book.copies); }}
                  >
                    {t("search.borrowBtn")}
                  </Button>
                  <Button
                    size="small"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => { e.stopPropagation(); onAddToCompare ? onAddToCompare(book._id || book.id) : (() => {
                      try {
                        const raw = localStorage.getItem('compare_ids') || '[]';
                        const arr = JSON.parse(raw);
                        if (!arr.includes(book._id || book.id)) arr.push(book._id || book.id);
                        localStorage.setItem('compare_ids', JSON.stringify(arr));
                      } catch {}
                    })(); }}
                  >
                    {t("search.addToCompare")}
                  </Button>
                </div>
              </div>
            ),
            book: book
          });
        }
      });

      // Deduplicate and limit quantity
      const uniqueSuggestions = suggestions.filter((item, index, self) => 
        index === self.findIndex(t => t.value === item.value)
      ).slice(0, 8);

      return uniqueSuggestions;
    } catch (error) {
      console.error('Error generating search suggestions:', error);
      setError(error);
      return [];
    }
  }, [searchValue, searchType, books, t]);

  // Update autocomplete options
  useEffect(() => {
    try {
      setOptions(generateOptions);
    } catch (error) {
      console.error('Error setting options:', error);
      setError(error);
      setOptions([]);
    }
  }, [generateOptions]);

  // Handle search
  const handleSearch = (value) => {
    try {
      setSearchValue(value);
      if (onSearch) {
        onSearch(value, searchType);
      }
    } catch (error) {
      console.error('Search error:', error);
      setError(error);
    }
  };

  // Handle option selection
  const handleSelect = (value) => {
    try {
      setSearchValue(value);
      if (onSearch) {
        onSearch(value, searchType);
      }
    } catch (error) {
      console.error('Select error:', error);
      setError(error);
    }
  };

  // Search type options
  const searchTypeOptions = [
    { value: "title", label: t("search.typeTitle") },
    { value: "author", label: t("search.typeAuthor") },
    { value: "category", label: t("search.typeCategory") },
  ];

  // Helper for placeholder
  const getPlaceholder = () => {
    if (searchType === "title") return t("search.enterTitle");
    if (searchType === "author") return t("search.enterAuthor");
    if (searchType === "category") return t("search.enterCategory");
    return t("search.placeholder");
  };

  // Error boundary display
  if (error) {
    return (
      <div className="enhanced-search-bar error-state">
        <div className="error-message">
          <Text type="danger">{t("search.searchError")}</Text>
        </div>
        <Input
          placeholder={t("search.placeholder")}
          onPressEnter={(e) => onSearch && onSearch(e.target.value, searchType)}
          style={{ width: '100%' }}
        />
      </div>
    );
  }

  return (
    <div className="enhanced-search-bar">
      <div className="search-controls">
        <AutoComplete
          className="search-autocomplete"
          options={options}
          onSearch={handleSearch}
          onSelect={handleSelect}
          value={searchValue}
          onChange={setSearchValue}
          placeholder={getPlaceholder()}
          loading={loading}
          allowClear
          style={{ width: '100%' }}
          notFoundContent={searchValue && searchValue.length >= 2 ? t("search.noMatching") : t("search.enterTwoChars")}
        >
          <Search
            prefix={<SearchOutlined style={{ color: theme.colors.neutral.darkGray }} aria-hidden="true" />}
            enterButton={t("common.search")}
            size="large"
            loading={loading}
            onSearch={handleSearch}
            aria-label={t("common.search")}
            style={{
              borderRadius: '8px',
              background: theme.colors.neutral.white,
              border: `1px solid ${theme.colors.neutral.gray}`,
              fontFamily: theme.typography.fontFamily.primary,
              fontSize: theme.typography.fontSize.md
            }}
          />
      </AutoComplete>

       <div className="search-type-selector">
          {searchTypeOptions.map(option => (
            <button
              key={option.value}
              className={`type-button ${searchType === option.value ? 'active' : ''}`}
              onClick={() => onSearchTypeChange && onSearchTypeChange(option.value)}
              style={{
                backgroundColor: searchType === option.value ? theme.colors.primary.main : 'transparent',
                color: searchType === option.value ? 'white' : theme.colors.neutral.darkGray,
                border: `1px solid ${searchType === option.value ? theme.colors.primary.main : theme.colors.neutral.lightGray}`,
                borderRadius: theme.borderRadius.md,
                padding: '8px 16px',
                fontFamily: theme.typography.fontFamily.primary,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {option.label}
            </button>
          ))}
        </div>

        <Tooltip title={t("common.refresh")}>
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={() => (onRefresh ? onRefresh() : window.location.reload())}
            style={{ borderColor: theme.colors.primary.main, color: theme.colors.primary.main }}
          />
        </Tooltip>
      </div>

      {Array.isArray(categoriesList) && categoriesList.length > 0 && (
        <div className="quick-category-tags">
          {categoriesList.slice(0, 12).map((cat, idx) => (
            <Tag
              key={`quick-cat-${idx}`}
              color={theme.colors.primary.main}
              className="quick-cat-tag"
              onClick={() => {
                onSearchTypeChange && onSearchTypeChange('category');
                onSearch && onSearch(cat, 'category');
              }}
            >
              {cat}
            </Tag>
          ))}
        </div>
      )}

      {searchValue && (
        <div className="search-stats">
          <Text type="secondary">
            {t("search.foundResults", { count: options.length })}
          </Text>
        </div>
      )}
    </div>
  );
}

export default EnhancedSearchBar;
