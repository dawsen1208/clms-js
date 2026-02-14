import React from 'react';
import { theme } from 'antd';

const EmptyStateIllustration = ({ style }) => {
  const { token } = theme.useToken();
  const primary = token.colorPrimary;
  const secondary = token.colorBorder;
  
  return (
    <svg width="200" height="160" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      {/* Background shape */}
      <path d="M100 130C140 130 170 120 170 100C170 80 140 70 100 70C60 70 30 80 30 100C30 120 60 130 100 130Z" fill={primary} fillOpacity="0.05"/>
      
      {/* Books stack */}
      <rect x="70" y="90" width="60" height="12" rx="2" fill="white" stroke={secondary} strokeWidth="2"/>
      <rect x="65" y="78" width="70" height="12" rx="2" fill="white" stroke={secondary} strokeWidth="2"/>
      <rect x="75" y="66" width="50" height="12" rx="2" fill="white" stroke={secondary} strokeWidth="2"/>
      
      {/* Floating elements */}
      <circle cx="50" cy="50" r="4" fill={primary} fillOpacity="0.3"/>
      <circle cx="150" cy="60" r="6" fill={primary} fillOpacity="0.2"/>
      <circle cx="130" cy="30" r="3" fill={primary} fillOpacity="0.4"/>
      
      {/* Search glass */}
      <g transform="translate(110, 50) rotate(15)">
        <circle cx="0" cy="0" r="16" stroke={primary} strokeWidth="2" fill="white" fillOpacity="0.5"/>
        <line x1="10" y1="10" x2="20" y2="20" stroke={primary} strokeWidth="2" strokeLinecap="round"/>
      </g>
    </svg>
  );
};

export default EmptyStateIllustration;
