import React from 'react';
import { Typography, Button } from 'antd';

const { Title, Text } = Typography;

const EmptyStateIllustration = ({ 
  title = "No Data Found", 
  description = "We couldn't find what you're looking for.", 
  action,
  width = 200,
  height = 160,
  color = '#A65D57' // Default to primary theme color
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center'
    }}>
      <svg 
        width={width} 
        height={height} 
        viewBox="0 0 200 160" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ marginBottom: 24, opacity: 0.8 }}
      >
        {/* Abstract Box/Shelf */}
        <path 
          d="M40 120H160M40 80H160M40 40H160" 
          stroke="#E0E0E0" 
          strokeWidth="2" 
          strokeLinecap="round"
        />
        
        {/* Floating Abstract Shape (Book/Paper) */}
        <path 
          d="M80 60C80 50 90 40 100 40C110 40 120 50 120 60V100C120 110 110 120 100 120C90 120 80 110 80 100V60Z" 
          fill="white" 
          stroke={color} 
          strokeWidth="2"
        />
        
        {/* Decorative Elements */}
        <circle cx="60" cy="50" r="4" fill="#DAA520" opacity="0.6" />
        <circle cx="140" cy="110" r="6" fill="#6B8E23" opacity="0.6" />
        <path 
          d="M130 30L140 40" 
          stroke="#333" 
          strokeWidth="1.5" 
          strokeLinecap="round"
        />
      </svg>
      
      <Title level={4} style={{ 
        fontFamily: "'Literata', serif", 
        marginBottom: 8,
        color: '#2C3E50'
      }}>
        {title}
      </Title>
      
      <Text type="secondary" style={{ 
        maxWidth: 300, 
        marginBottom: action ? 24 : 0,
        display: 'block'
      }}>
        {description}
      </Text>
      
      {action}
    </div>
  );
};

export default EmptyStateIllustration;
