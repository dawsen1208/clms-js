// ✅ Book grid layout component - performance optimized version
import { Row, Col, Empty, Spin } from "antd";
import BookCard from "../BookCard";
import "./BookGrid.css";
import { useState, useEffect } from "react";

function BookGrid({ books, onBorrow, onRenew, onReturn, loading = false, userBorrowedBooks = new Set(), userBorrowedBooksCount = {}, borrowedInfo = {}, pendingBookIds = new Set(), showAll = false }) {
  const [displayBooks, setDisplayBooks] = useState([]);
  const [displayCount, setDisplayCount] = useState(12); // Initial display count
  
  const handleBorrowBook = (bookId, bookTitle, copies) => {
    if (onBorrow) {
      onBorrow(bookId, bookTitle, copies);
    }
  };

  // Display books in batches, optimize performance
  useEffect(() => {
    if (!books || books.length === 0) {
      setDisplayBooks([]);
      return;
    }
    if (showAll) {
      setDisplayBooks(books);
      setDisplayCount(books.length);
      return;
    }
    // Only show first N books to avoid rendering too many at once
    setDisplayBooks(books.slice(0, displayCount));
  }, [books, displayCount, showAll]);

  // Scroll to load more (rAF throttled)
  useEffect(() => {
    if (showAll) return; // no infinite scroll when showing all
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (!loading && displayBooks.length < books.length) {
          const scrollTop = window.scrollY || document.documentElement.scrollTop;
          const scrollHeight = document.documentElement.scrollHeight;
          const clientHeight = window.innerHeight;
          if (scrollTop + clientHeight >= scrollHeight - 200) {
            setDisplayCount(prev => Math.min(prev + 12, books.length));
          }
        }
        ticking = false;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loading, displayBooks.length, books.length, showAll]);

  if (loading) {
    return (
      <div className="book-grid-loading">
        <Spin size="large" tip="Loading books..." />
      </div>
    );
  }

  if (!books || books.length === 0) {
    return (
      <div className="book-grid-empty">
        <Empty 
          description="No books available"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    );
  }

  return (
    <div className="book-grid-container">
      <Row 
        gutter={[24, 24]} 
        justify="start"
        className="book-grid"
      >
        {displayBooks.map((book) => (
          <Col 
            key={book._id || book.id}
            xs={24}    // Mobile: 1 column
            sm={12}    // Small tablet: 2 columns  
            md={8}     // Tablet: 3 columns
            lg={6}     // Desktop: 4 columns
            xl={6}     // Large screen: 4 columns
            xxl={6}    // Extra large screen: 4 columns
            className="book-grid-item"
          >
            <BookCard 
              book={book}
              onBorrow={handleBorrowBook}
              onRenew={onRenew}
              onReturn={onReturn}
              loading={loading}
              userBorrowedBooks={userBorrowedBooks}
              userBorrowedBooksCount={userBorrowedBooksCount}
              borrowedInfo={borrowedInfo[book._id || book.id]}
              isPending={pendingBookIds.has(String(book._id || book.id))}
            />
          </Col>
        ))}
      </Row>
    </div>
  );
}

export default BookGrid;
