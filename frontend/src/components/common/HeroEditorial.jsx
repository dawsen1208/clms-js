import React from 'react';
import { Typography, Button, Space } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const HeroEditorial = ({ 
  title, 
  subtitle, 
  ctaText, 
  onCtaClick, 
  illustration,
  backgroundImage,
  className = ''
}) => {
  return (
    <div className={`hero-editorial ${className}`} style={{ 
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 16,
      padding: '64px 48px',
      background: backgroundImage ? `url(${backgroundImage})` : 'var(--bg-paper-subtle)',
      minHeight: 480,
      display: 'flex',
      alignItems: 'center'
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)',
        zIndex: 0
      }} />

      <div className="editorial-grid" style={{ 
        position: 'relative', 
        zIndex: 1, 
        width: '100%',
        alignItems: 'center'
      }}>
        <div className="col-span-6" style={{ paddingRight: 32 }}>
          <Title level={1} style={{ 
            fontFamily: "'Literata', serif", 
            fontSize: '3.5rem', 
            marginBottom: 24,
            lineHeight: 1.1,
            color: '#2C3E50'
          }}>
            {title}
          </Title>
          
          <Paragraph style={{ 
            fontSize: '1.25rem', 
            color: '#546E7A', 
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
                fontSize: 18,
                boxShadow: '0 8px 16px rgba(166, 93, 87, 0.2)'
              }}
            >
              {ctaText}
            </Button>
          )}
        </div>
        
        <div className="col-span-6" style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          height: '100%' 
        }}>
          {illustration || (
            <div style={{
              width: '100%',
              height: 320,
              background: '#E0E0E0',
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9E9E9E'
            }}>
              Hero Illustration Placeholder
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroEditorial;
