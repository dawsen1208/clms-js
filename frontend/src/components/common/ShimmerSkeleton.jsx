import React from 'react';

const ShimmerSkeleton = ({ 
  width = '100%', 
  height = 20, 
  borderRadius = 4, 
  className = '',
  style = {} 
}) => {
  return (
    <div 
      className={`shimmer-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#f0f0f0',
        backgroundImage: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite linear',
        ...style
      }}
    />
  );
};

export default ShimmerSkeleton;
