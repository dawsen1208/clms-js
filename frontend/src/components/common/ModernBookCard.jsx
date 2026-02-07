import React from 'react';
import { Card, Button, Typography, Tag, Tooltip } from 'antd';
import { BookOutlined, UserOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

const categoryColors = {
  "Fiction": "blue",
  "Science": "purple",
  "Technology": "cyan",
  "History": "gold",
  "Biography": "magenta",
  "Business": "geekblue",
  "Art": "volcano",
  "default": "default"
};

const ModernBookCard = ({ book, onBorrow, onRenew, isBorrowed, isPending, loading }) => {
  const navigate = useNavigate();
  const { _id, id, title, author, category, copies, available, coverUrl } = book;
  const bookId = _id || id;
  const isAvailable = copies > 0;

  const handleCardClick = () => {
    navigate(`/book/${bookId}`);
  };

  const handleBorrowClick = (e) => {
    e.stopPropagation();
    if (onBorrow) onBorrow(bookId, title, copies);
  };

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        hoverable
        onClick={handleCardClick}
        bordered={false}
        className="card-shadow"
        cover={
          <div style={{ 
            height: 200, 
            background: coverUrl ? `url(${coverUrl}) center/cover` : 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {!coverUrl && (
              <div style={{ textAlign: 'center', padding: 20 }}>
                <BookOutlined style={{ fontSize: 48, color: '#1890ff', opacity: 0.5 }} />
                <div style={{ marginTop: 8, fontWeight: 600, color: '#0050b3' }}>{title.substring(0, 1)}</div>
              </div>
            )}
            
            {/* Status Tag */}
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <Tag color={isAvailable ? 'success' : 'error'} style={{ margin: 0, borderRadius: 12, border: 'none' }}>
                {isAvailable ? 'In Stock' : 'Out'}
              </Tag>
            </div>
            
            {/* Bookmark Corner (Signature Element) */}
            <div className="bookmark-corner" />
            
            {/* Hover Overlay */}
            <div className="book-card-overlay">
              <Button type="primary" shape="round" onClick={handleBorrowClick} disabled={!isAvailable}>
                {isAvailable ? 'Quick Borrow' : 'Unavailable'}
              </Button>
            </div>
          </div>
        }
        bodyStyle={{ padding: '16px' }}
        style={{ borderRadius: 14, overflow: 'hidden' }}
      >
        <div style={{ marginBottom: 8 }}>
          <Tag color={categoryColors[category] || 'default'} style={{ borderRadius: 4, fontSize: 10, border: 'none' }}>
            {category || 'General'}
          </Tag>
        </div>
        
        <Tooltip title={title}>
          <Title level={5} style={{ margin: '0 0 4px 0', fontSize: 16 }} className="text-ellipsis">
            {title}
          </Title>
        </Tooltip>
        
        <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 12 }} className="text-ellipsis">
          by {author}
        </Text>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: '#8c8c8c' }}>
            <UserOutlined style={{ marginRight: 4 }} /> {copies} copies
          </div>
          {isBorrowed && (
             <Tag color="processing" style={{ margin: 0 }}>Borrowed</Tag>
          )}
        </div>
      </Card>
      
      <style jsx>{`
        .book-card-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s;
        }
        .ant-card:hover .book-card-overlay {
          opacity: 1;
        }
      `}</style>
    </motion.div>
  );
};

export default ModernBookCard;
