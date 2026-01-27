// ✅ Modern book card component
import { Card, Button, Tag, Typography, Space } from "antd";
import { BookOutlined, UserOutlined, CalendarOutlined, TagOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import "./BookCard.css";
import { memo } from "react";

// Category gradient color mapping
const categoryGradients = {
  "Fiction": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "Science": "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "Technology": "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "History": "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "Biography": "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "Business": "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  "Art": "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
  "Philosophy": "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  "Psychology": "linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)",
  "default": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
};

const { Title, Text } = Typography;

function BookCard({ book, onBorrow, onRenew, onReturn, loading, userBorrowedBooks = new Set(), userBorrowedBooksCount = {}, borrowedInfo, isPending = false }) {
  const navigate = useNavigate();
  const {
    _id,
    id,
    title,
    author,
    category,
    publishedYear,
    available,
    description,
    copies,
  } = book;

  const bookId = _id || id;
  const isBorrowedByUser = userBorrowedBooks.has(bookId);
  const borrowedCount = userBorrowedBooksCount[bookId] || 0;
  const isMaxBorrowed = borrowedCount >= 2;
  const daysLeft = borrowedInfo?.daysLeft ?? null;
  
  const handleBorrow = (e) => {
    e.stopPropagation(); // Prevent card click event
    console.log('Borrow button clicked:', { bookId, title, copies, isBorrowedByUser, isMaxBorrowed });
    
    if (onBorrow && copies > 0 && !isBorrowedByUser && !isMaxBorrowed) {
      onBorrow(bookId, title, copies);
    } else {
      console.log('Borrow conditions not met:', { copies, isBorrowedByUser, isMaxBorrowed });
    }
  };

  const handleViewDetails = () => {
    // Navigate to book details page while preserving current location for back navigation
    navigate(`/book/${bookId}`, { state: { from: window.location.pathname + window.location.search } });
  };

  return (
    <div className="book-card-container">
      <Card
        className="book-card"
        hoverable
        onClick={handleViewDetails}
        style={{ 
          cursor: 'pointer',
          background: 'white',
          border: '1px solid #e8e8e8',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderTop: `4px solid ${categoryGradients[category] ? categoryGradients[category].split(' ')[3] : '#667eea'}`
        }}
        actions={[
          <div key="actions" className="borrow-button-container" style={{ display: 'flex', gap: '8px', padding: '0 16px' }}>
            {!isBorrowedByUser ? (
              <Button
                key="borrow"
                type="primary"
                size="small"
                loading={loading}
                disabled={copies <= 0 || isMaxBorrowed}
                onClick={handleBorrow}
                style={{ flex: 1, fontWeight: 600, borderRadius: '8px', height: '32px' }}
              >
                {copies <= 0 ? 'Out of Stock' : isMaxBorrowed ? 'Max 2 Copies' : 'Borrow'}
              </Button>
            ) : (
              <>
                <Button
                  key="renew7"
                  type="default"
                  disabled={isPending}
                  onClick={(e) => { e.stopPropagation(); onRenew?.(bookId, 7); }}
                  size="small"
                  style={{ borderColor: '#1677FF', color: '#1677FF', borderRadius: '8px', flex: 1 }}
                >
                  {isPending ? 'Pending' : 'Renew +7'}
                </Button>
                <Button
                  key="return"
                  danger
                  type="primary"
                  disabled={isPending}
                  onClick={(e) => { e.stopPropagation(); onReturn?.(bookId, title); }}
                  size="small"
                  style={{ borderRadius: '8px' }}
                >
                  {isPending ? 'Pending' : 'Return'}
                </Button>
              </>
            )}
          </div>
        ]}
      >
        <div className="book-info">
          <Title level={4} className="book-title" ellipsis={{ rows: 2 }} style={{ color: '#262626' }}>
            {title}
          </Title>
          
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <div className="book-author">
              <UserOutlined style={{ color: '#8c8c8c' }} />
              <Text style={{ color: '#595959' }} ellipsis>
                {author || 'Unknown Author'}
              </Text>
            </div>

            {category && (
              <div className="book-category">
                <TagOutlined style={{ color: '#8c8c8c' }} />
                <Tag 
                  color="#1677ff"
                  style={{ margin: 0, fontSize: '12px' }}
                >
                  {category}
                </Tag>
              </div>
            )}

            {publishedYear && (
              <div className="book-year">
                <CalendarOutlined style={{ color: '#8c8c8c' }} />
                <Text style={{ color: '#595959' }}>
                  {publishedYear}
                </Text>
              </div>
            )}

            <div className="book-copies">
              <BookOutlined style={{ color: '#8c8c8c' }} />
              <Text style={{ color: '#595959' }}>
                Available: {copies || 0} copies
              </Text>
            </div>
          </Space>

          {isBorrowedByUser && (
            <div className="book-borrow-info">
              <Text style={{ color: daysLeft == null ? '#8c8c8c' : (daysLeft > 3 ? '#52C41A' : daysLeft >= 0 ? '#FAAD14' : '#FF4D4F') }}>
                {daysLeft == null ? 'Borrowed' : daysLeft >= 0 ? `Due in ${daysLeft} days` : `Overdue by ${Math.abs(daysLeft)} days`}
              </Text>
            </div>
          )}

          {description && (
            <div className="book-description">
              <Text style={{ color: '#8c8c8c' }} ellipsis={{ rows: 2 }}>
                {description}
              </Text>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default memo(BookCard);
