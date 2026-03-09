/**
 * Modern Book Card Component
 * A stylized card for displaying book information, status (borrowed/pending), and borrowing actions.
 */
import React from 'react';
import { Card, Typography, Tag, Button, Space, Tooltip, Badge, theme } from 'antd';
import { 
  BookOutlined, 
  UserOutlined, 
  ClockCircleOutlined, 
  CheckCircleOutlined,
  SyncOutlined,
  ReadOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

const ModernBookCard = ({ 
  book, 
  onBorrow, 
  onView,
  isBorrowed = false,
  isPending = false
}) => {
  const { token } = theme.useToken();
  
  const isAvailable = book.copies > 0;
  
  // Generate a consistent color based on category using theme tokens
  const getCategoryColor = (category) => {
    const colors = [
      token.colorPrimary,
      token.colorSuccess,
      token.colorWarning,
      token.colorError,
      token.colorInfo
    ];
    let hash = 0;
    const str = category || 'default';
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const categoryColor = getCategoryColor(book.category);

  const handleAction = (e) => {
    e.stopPropagation();
    if (onBorrow) {
      onBorrow(book._id || book.id, book.title, book.copies);
    }
  };

  return (
    <Card
      hoverable
      bordered={false}
      style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        borderRadius: token.borderRadiusLG,
        overflow: 'hidden',
        position: 'relative'
      }}
      bodyStyle={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        padding: 20 
      }}
      onClick={onView}
    >
      {/* Category Indicator Strip */}
      <div style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: 4, 
        height: '100%', 
        background: categoryColor 
      }} />

      {/* Header */}
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, paddingRight: 8 }}>
          <Tooltip title={book.title}>
            <Title level={5} ellipsis={{ rows: 2 }} style={{ margin: 0, fontSize: 16 }}>
              {book.title}
            </Title>
          </Tooltip>
        </div>
        {isBorrowed ? (
          <Badge status="processing" text={<span style={{ fontSize: 12, color: token.colorTextSecondary }}>Borrowed</span>} />
        ) : isPending ? (
          <Badge status="warning" text={<span style={{ fontSize: 12, color: token.colorTextSecondary }}>Pending</span>} />
        ) : !isAvailable ? (
          <Badge status="error" />
        ) : null}
      </div>

      {/* Meta Info */}
      <Space direction="vertical" size={4} style={{ width: '100%', marginBottom: 16, flex: 1 }}>
        <Space size={6} align="center">
          <UserOutlined style={{ fontSize: 12, color: token.colorTextTertiary }} />
          <Text type="secondary" style={{ fontSize: 13 }} ellipsis>{book.author}</Text>
        </Space>
        
        <Space size={6} align="center">
          <Tag color={categoryColor} style={{ margin: 0, border: 'none', fontSize: 12, lineHeight: '20px' }}>
            {book.category || 'General'}
          </Tag>
          {book.rating > 0 && (
            <Tag color="gold" style={{ margin: 0, border: 'none', fontSize: 12 }}>
              ★ {book.rating}
            </Tag>
          )}
        </Space>
      </Space>

      {/* Footer / Action */}
      <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text type={isAvailable ? "secondary" : "danger"} style={{ fontSize: 12 }}>
          {isAvailable ? `${book.copies} Available` : "Out of Stock"}
        </Text>

        <Button 
          type={isAvailable && !isBorrowed && !isPending ? "primary" : "default"}
          size="small"
          ghost={isAvailable && !isBorrowed && !isPending}
          icon={isBorrowed ? <CheckCircleOutlined /> : isPending ? <ClockCircleOutlined /> : <BookOutlined />}
          disabled={!isAvailable || isBorrowed || isPending}
          onClick={handleAction}
          style={{ 
            borderRadius: 16,
            fontSize: 12,
            height: 28,
            padding: '0 12px'
          }}
        >
          {isBorrowed ? "Borrowed" : isPending ? "Pending" : "Borrow"}
        </Button>
      </div>
    </Card>
  );
};

export default ModernBookCard;
