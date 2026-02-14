import React from 'react';
import { Typography, theme, Tag, Avatar, Button } from 'antd';
import { ArrowRightOutlined, CalendarOutlined, UserOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const ListCard = ({ 
  title, 
  subtitle, 
  description, 
  date, 
  status, 
  avatar, 
  image, 
  actionLabel, 
  onAction,
  tags = [],
  highlight = false,
  onClick
}) => {
  const { token } = theme.useToken();

  return (
    <div 
      className="editorial-card"
      onClick={onClick}
      style={{ 
        padding: 20, 
        display: 'flex', 
        alignItems: 'center', 
        gap: 20,
        cursor: onClick ? 'pointer' : 'default',
        background: highlight ? `${token.colorPrimary}08` : token.colorBgContainer,
        border: highlight ? `1px solid ${token.colorPrimary}40` : `1px solid ${token.colorBorderSecondary}`,
        transition: 'all 0.3s ease',
      }}
    >
      {(image || avatar) && (
        <div style={{ flexShrink: 0 }}>
          {image ? (
            <div style={{ 
              width: 80, 
              height: 80, 
              borderRadius: 12, 
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}>
              <img src={image} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : (
            <Avatar 
              size={56} 
              src={avatar} 
              icon={<UserOutlined />} 
              style={{ 
                backgroundColor: token.colorPrimary, 
                color: '#fff',
                fontSize: 24 
              }} 
            />
          )}
        </div>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {status && (
              <Tag 
                color={status === 'active' ? 'success' : status === 'pending' ? 'warning' : 'default'} 
                style={{ 
                  margin: 0, 
                  borderRadius: 12, 
                  border: 'none', 
                  fontSize: 11, 
                  fontWeight: 600,
                  textTransform: 'uppercase'
                }}
              >
                {status}
              </Tag>
            )}
            <Text type="secondary" style={{ fontSize: 12, letterSpacing: '0.05em' }}>
              {subtitle}
            </Text>
          </div>
          {date && (
            <Text type="secondary" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CalendarOutlined /> {date}
            </Text>
          )}
        </div>
        
        <Title level={5} style={{ 
          margin: '0 0 6px 0', 
          fontFamily: "'Literata', serif", 
          fontWeight: 600,
          fontSize: 18 
        }}>
          {title}
        </Title>
        
        {description && (
          <Text type="secondary" ellipsis={{ rows: 2 }} style={{ fontSize: 14, lineHeight: 1.6 }}>
            {description}
          </Text>
        )}

        {tags && tags.length > 0 && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {tags.map((tag, index) => (
              <span key={index} style={{ 
                fontSize: 12, 
                color: token.colorTextSecondary, 
                background: token.colorBgLayout, 
                padding: '2px 8px', 
                borderRadius: 4 
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {actionLabel && (
        <div style={{ flexShrink: 0 }}>
          <Button 
            type="text" 
            icon={<ArrowRightOutlined />} 
            onClick={(e) => {
              e.stopPropagation();
              onAction && onAction();
            }}
            style={{ color: token.colorPrimary }}
          >
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ListCard;
