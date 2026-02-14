import React from 'react';
import { Typography, Button, Space, Grid, theme } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;
const { useBreakpoint } = Grid;
const { useToken } = theme;

const HeroEditorial = ({ 
  title, 
  subtitle, 
  ctaText, 
  onCtaClick, 
  illustration,
  backgroundImage,
  className = ''
}) => {
  const screens = useBreakpoint();
  const { token } = useToken();
  const isMobile = !screens.md;

  return (
    <div className={`hero-editorial ${className}`} style={{ 
      position: 'relative',
      overflow: 'hidden',
      borderRadius: token.borderRadiusLG * 2,
      padding: isMobile ? '40px 24px' : '64px 48px',
      background: backgroundImage ? `url(${backgroundImage})` : '#FAF9F6', // Warm paper background
      minHeight: isMobile ? 'auto' : 480,
      display: 'flex',
      alignItems: 'center',
      marginBottom: 48,
      border: `1px solid ${token.colorBorderSecondary}`,
      boxShadow: '0 20px 40px rgba(0,0,0,0.02)'
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: -100,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(166, 93, 87, 0.05) 0%, transparent 70%)', // Warm accent
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        bottom: -50,
        left: -50,
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(230, 126, 34, 0.05) 0%, transparent 70%)', // Orange accent
        zIndex: 0
      }} />

      <div className="editorial-grid" style={{ 
        position: 'relative', 
        zIndex: 1, 
        width: '100%',
        alignItems: 'center',
        display: isMobile ? 'flex' : 'grid',
        flexDirection: isMobile ? 'column-reverse' : 'row',
        gap: isMobile ? 32 : 0
      }}>
        <div className={isMobile ? "" : "col-span-6"} style={{ paddingRight: isMobile ? 0 : 32 }}>
          <div style={{ 
            display: 'inline-block', 
            padding: '4px 12px', 
            borderRadius: 20, 
            background: 'rgba(166, 93, 87, 0.1)', 
            color: '#A65D57',
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 16,
            letterSpacing: 1
          }}>
            FEATURED COLLECTION
          </div>
          <Title level={1} style={{ 
            fontFamily: "'Literata', serif", 
            fontSize: isMobile ? '2.5rem' : '3.5rem', 
            marginBottom: 24,
            lineHeight: 1.1,
            color: '#2C3E50',
            fontWeight: 400
          }}>
            {title}
          </Title>
          
          <Paragraph style={{ 
            fontFamily: "'Inter', sans-serif",
            fontSize: isMobile ? '1rem' : '1.25rem', 
            color: token.colorTextSecondary, 
            marginBottom: 32,
            maxWidth: 480,
            lineHeight: 1.6
          }}>
            {subtitle}
          </Paragraph>
          
          {ctaText && (
            <Button 
              type="primary" 
              size="large" 
              shape="round"
              onClick={onCtaClick}
              icon={<ArrowRightOutlined />}
              style={{ 
                height: 56, 
                padding: '0 32px', 
                fontSize: 16,
                background: '#2C3E50', // Dark slate for contrast
                borderColor: '#2C3E50',
                boxShadow: '0 8px 20px rgba(44, 62, 80, 0.2)'
              }}
            >
              {ctaText}
            </Button>
          )}
        </div>
        
        <div className={isMobile ? "" : "col-span-6"} style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: '100%',
          width: '100%'
        }}>
          {illustration}
        </div>
      </div>
    </div>
  );
};

export default HeroEditorial;
