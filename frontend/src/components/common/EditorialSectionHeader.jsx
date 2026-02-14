import React from 'react';
import { Typography, Button, theme, Grid } from 'antd';
import { RightOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { useToken } = theme;
const { useBreakpoint } = Grid;

const EditorialSectionHeader = ({ 
  title, 
  subtitle, 
  action, 
  actionText = "View All", 
  onActionClick, 
  className = ''
}) => {
  const { token } = useToken();
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <div className={`editorial-section-header ${className}`} style={{ 
      marginBottom: 32, 
      marginTop: isMobile ? 48 : 64,
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'flex-end',
      justifyContent: 'space-between',
      borderBottom: `1px solid ${token.colorBorderSecondary}`,
      paddingBottom: 16,
      gap: isMobile ? 16 : 0
    }}>
      <div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          marginBottom: 8 
        }}>
          <div style={{ 
            width: 4, 
            height: isMobile ? 20 : 24, 
            background: token.colorPrimary,
            marginRight: 12,
            borderRadius: 2
          }} />
          <Title level={2} style={{ 
            margin: 0, 
            fontFamily: "'Literata', serif",
            fontSize: isMobile ? '1.5rem' : '2rem',
            lineHeight: 1.1,
            color: token.colorTextHeading
          }}>
            {title}
          </Title>
        </div>
        {subtitle && (
          <Text type="secondary" style={{ 
            fontSize: isMobile ? '0.875rem' : '1rem', 
            marginLeft: 16,
            display: 'block',
            marginTop: 4,
            fontFamily: "'Inter', sans-serif"
          }}>
            {subtitle}
          </Text>
        )}
      </div>

      {(action || onActionClick) && (
        <div style={{ marginBottom: isMobile ? 0 : 4, alignSelf: isMobile ? 'flex-end' : 'auto' }}>
          {action || (
            <Button type="text" onClick={onActionClick} style={{ 
              fontSize: 14, 
              color: token.colorPrimary, 
              fontWeight: 600,
              padding: 0,
              height: 'auto'
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
