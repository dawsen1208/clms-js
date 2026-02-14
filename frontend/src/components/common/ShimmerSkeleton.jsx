import React from 'react';
import { theme } from 'antd';

const ShimmerSkeleton = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4, 
  className = '',
  style = {} 
}) => {
  const { token } = theme.useToken();
  return (
    <div 
      className={`shimmer-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: token.colorFillTertiary,
        backgroundImage: `linear-gradient(90deg, ${token.colorFillTertiary} 25%, ${token.colorFillQuaternary} 50%, ${token.colorFillTertiary} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite linear',
        ...style
      }}
    />
  );
};

export default ShimmerSkeleton;
