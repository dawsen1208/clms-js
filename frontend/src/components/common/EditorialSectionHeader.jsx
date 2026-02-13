import React from 'react';
import { Typography, Space, Button } from 'antd';
import { RightOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const EditorialSectionHeader = ({ 
  title, 
  subtitle, 
  action, 
  actionText = "View All", 
  onActionClick, 
  className = ''
}) => {
  return (
    <div className={`editorial-section-header ${className}`} style={{ 
      marginBottom: 32, 
      marginTop: 64,
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      borderBottom: '1px solid rgba(0,0,0,0.05)',
      paddingBottom: 16
    }}>
      <div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: 8 
        }}>
          <div style={{ 
            width: 4, 
            height: 24, 
            background: '#A65D57', 
            marginRight: 12,
            borderRadius: 2
          }} />
          <Title level={2} style={{ 
            margin: 0, 
            fontFamily: "'Literata', serif",
            fontSize: '2rem',
            lineHeight: 1.1
          }}>
            {title}
          </Title>
        </div>
        {subtitle && (
          <Text type="secondary" style={{ 
            fontSize: '1rem', 
            marginLeft: 16,
            display: 'block',
            marginTop: 4
          }}>
            {subtitle}
          </Text>
        )}
      </div>

      {(action || onActionClick) && (
        <div style={{ marginBottom: 4 }}>
          {action || (
            <Button type="text" onClick={onActionClick} style={{ 
              fontSize: 14, 
              color: '#A65D57', 
              fontWeight: 500 
            }}>
              {actionText} <RightOutlined style={{ fontSize: 10 }} />
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default EditorialSectionHeader;
