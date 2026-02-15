import React from 'react';
import { Layout, Typography, theme, Breadcrumb } from 'antd';

const { Content, Header } = Layout;
const { Title, Text } = Typography;

const EditorialPageShell = ({ 
  title, 
  subtitle, 
  headerAction, 
  children,
  maxWidth = 1400
}) => {
  const { token } = theme.useToken();

  return (
    <div style={{ 
      minHeight: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      maxWidth: maxWidth,
      margin: '0 auto',
      width: '100%'
    }}>
      {/* Editorial Header */}
      <div style={{ 
        padding: '32px 0 48px 0', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-end',
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        marginBottom: 32
      }}>
        <div>
          {/* Breadcrumb could go here if needed */}
          <Title level={1} style={{ 
            margin: '0 0 8px 0', 
            fontFamily: "'Literata', serif",
            fontSize: 42,
            fontWeight: 600,
            color: token.colorTextHeading
          }}>
            {title}
          </Title>
          {subtitle && (
            <Text type="secondary" style={{ 
              fontSize: 18, 
              fontFamily: "'Inter', sans-serif",
              fontWeight: 300,
              maxWidth: 600,
              display: 'block'
            }}>
              {subtitle}
            </Text>
          )}
        </div>
        {headerAction && (
          <div style={{ paddingBottom: 8 }}>
            {headerAction}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, paddingBottom: 48 }}>
        {children}
      </div>
    </div>
  );
};

export default EditorialPageShell;
