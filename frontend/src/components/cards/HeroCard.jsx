import React from 'react';
import { Card, Typography, Button, theme } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const HeroCard = ({ 
  title, 
  subtitle, 
  backgroundImage, 
  actionLabel, 
  onAction,
  height = 400,
  dark = false,
  tag
}) => {
  const { token } = theme.useToken();
  
  return (
    <div 
      className="editorial-card animate-fade-in"
      style={{ 
        position: 'relative', 
        height: height, 
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end', // Bottom align for editorial look
        padding: 48,
        borderRadius: 24,
        color: dark ? '#fff' : token.colorText,
        border: 'none'
      }}
    >
      {/* Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: 0,
        transition: 'transform 0.5s ease',
      }} className="hero-bg" />
      
      {/* Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: dark 
          ? 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.8) 100%)'
          : 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0.95) 100%)',
        zIndex: 1,
      }} />
      
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 700 }}>
        {tag && (
          <div style={{
            display: 'inline-block',
            padding: '6px 12px',
            background: dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)',
            backdropFilter: 'blur(10px)',
            borderRadius: 20,
            marginBottom: 16,
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: dark ? '#fff' : token.colorTextSecondary
          }}>
            {tag}
          </div>
        )}
        
        <Title level={1} style={{ 
          fontSize: 42, 
          marginBottom: 16, 
          color: dark ? '#fff' : token.colorTextHeading,
          fontFamily: "'Literata', serif",
          fontWeight: 600,
          lineHeight: 1.2
        }}>
          {title}
        </Title>
        <Text style={{ 
          fontSize: 18, 
          display: 'block', 
          marginBottom: 32,
          opacity: 0.9,
          color: dark ? 'rgba(255,255,255,0.9)' : token.colorTextSecondary,
          lineHeight: 1.6,
          maxWidth: 500
        }}>
          {subtitle}
        </Text>
        
        {actionLabel && (
          <Button 
            type="primary" 
            size="large" 
            onClick={onAction}
            icon={<ArrowRightOutlined />}
            style={{ 
              height: 52, 
              padding: '0 32px', 
              fontSize: 16,
              borderRadius: 26,
              border: 'none',
              fontWeight: 500
            }}
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default HeroCard;
