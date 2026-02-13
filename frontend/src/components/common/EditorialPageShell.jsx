import React from 'react';
import { Breadcrumb, Typography, Space, theme } from 'antd';
import { useLocation, Link } from 'react-router-dom';

const { Title, Text } = Typography;

/**
 * EditorialPageShell - Warm Magazine Style Page Container
 * 
 * Features:
 * - Editorial Typography (Literata for headings)
 * - 12-column grid layout support
 * - Generous whitespace and "breathing room"
 * - Optional breadcrumbs
 * - Right-side action area
 */
const EditorialPageShell = ({ 
  title, 
  subtitle, 
  extra, 
  children, 
  breadcrumbItems,
  noPadding = false,
  fullWidth = false,
  className = ''
}) => {
  const { token } = theme.useToken();
  const location = useLocation();

  // Generate breadcrumbs if not provided
  const breadcrumbs = breadcrumbItems || [
    { title: <Link to="/">Home</Link> },
    ...location.pathname.split('/').filter(i => i).map((path, index, arr) => ({
      title: <Link to={`/${arr.slice(0, index + 1).join('/')}`}>{path.charAt(0).toUpperCase() + path.slice(1)}</Link>
    }))
  ];

  return (
    <div className={`editorial-page-shell ${className}`} style={{ 
      width: '100%', 
      maxWidth: fullWidth ? '100%' : '1440px', 
      margin: '0 auto',
      padding: noPadding ? 0 : '0 24px 48px',
      minHeight: '80vh'
    }}>
      {/* Editorial Header Section */}
      <div className="editorial-header" style={{ 
        marginBottom: 48, 
        paddingTop: 32,
        position: 'relative'
      }}>
        <div style={{ marginBottom: 16 }}>
          <Breadcrumb items={breadcrumbs} separator="·" />
        </div>

        <div className="editorial-grid" style={{ alignItems: 'end' }}>
          <div className="col-span-8">
            {title && (
              <Title level={1} style={{ 
                margin: 0, 
                fontFamily: "'Literata', serif", 
                fontWeight: 600,
                fontSize: '2.5rem',
                lineHeight: 1.2,
                color: token.colorTextHeading
              }}>
                {title}
              </Title>
            )}
            {subtitle && (
              <Text type="secondary" style={{ 
                fontSize: '1.1rem', 
                marginTop: 12, 
                display: 'block',
                maxWidth: '600px',
                lineHeight: 1.6,
                fontFamily: "'Inter', sans-serif"
              }}>
                {subtitle}
              </Text>
            )}
          </div>

          <div className="col-span-4" style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            alignItems: 'center',
            height: '100%'
          }}>
            {extra && (
              <Space size="middle">
                {extra}
              </Space>
            )}
          </div>
        </div>
        
        {/* Decorative underline/separator */}
        <div style={{ 
          marginTop: 32, 
          height: 1, 
          background: 'linear-gradient(90deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.02) 100%)',
          width: '100%'
        }} />
      </div>

      {/* Main Content Area */}
      <div className="editorial-content">
        {children}
      </div>
    </div>
  );
};

export default EditorialPageShell;
