import React from 'react';
import { Typography, Tag, Space, theme } from 'antd';
import BookCoverPro from '../common/BookCoverPro';

const { Title, Text } = Typography;

const MediaCard = ({ 
  title, 
  author, 
  coverUrl, 
  category, 
  tags = [], 
  onClick,
  bookId
}) => {
  const { token } = theme.useToken();

  return (
    <div 
      className="editorial-card" 
      onClick={onClick}
      style={{ 
        cursor: 'pointer',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: 'none',
        background: token.colorBgContainer
      }}
    >
      {/* Cover Area */}
      <div style={{ 
        position: 'relative', 
        paddingTop: '110%', // Taller aspect ratio
        background: '#f0f0f0',
        overflow: 'hidden',
        borderBottom: `1px solid ${token.colorBorderSecondary}`
      }}>
        <div style={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: 32
        }}>
          {/* Subtle Float Animation */}
          <div style={{ 
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)', 
            transition: 'transform 0.3s ease',
            transform: 'translateY(0)',
          }}
          className="book-hover-lift"
          >
             <BookCoverPro 
               title={title} 
               author={author} 
               width={140} 
               height={210} 
               imageUrl={coverUrl}
             />
          </div>
        </div>
        
        {category && (
          <Tag 
            bordered={false}
            style={{ 
              position: 'absolute', 
              top: 16, 
              left: 16, 
              background: 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              color: token.colorText,
              fontWeight: 500,
              borderRadius: 12,
              padding: '0 10px',
              fontSize: 12
            }}
          >
            {category}
          </Tag>
        )}
      </div>

      {/* Content Area */}
      <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Title level={5} ellipsis={{ rows: 2 }} style={{ 
          margin: '0 0 6px 0', 
          fontSize: 18, 
          lineHeight: 1.4,
          fontFamily: "'Literata', serif",
          fontWeight: 600
        }}>
          {title}
        </Title>
        <Text type="secondary" style={{ fontSize: 14, marginBottom: 16, display: 'block' }}>{author}</Text>
        
        <div style={{ marginTop: 'auto' }}>
          <Space size={[0, 8]} wrap>
            {tags.slice(0, 2).map(tag => (
              <Tag key={tag} bordered={false} style={{ 
                background: token.colorBgLayout, 
                color: token.colorTextSecondary,
                margin: 0, 
                marginRight: 6,
                borderRadius: 4
              }}>
                #{tag}
              </Tag>
            ))}
          </Space>
        </div>
      </div>
    </div>
  );
};

export default MediaCard;
