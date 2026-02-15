import React, { useRef, useEffect } from 'react';
import { theme } from 'antd';

// Helper: Wrap Text
const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
  const words = text.split(' ');
  let line = '';
  
  for(let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
};

// Style: Swiss Minimalist
const drawSwiss = (ctx, w, h, t, a, color, palette) => {
  // Background
  ctx.fillStyle = palette.paperBg; // Warm paper
  ctx.fillRect(0, 0, w, h);
  
  // Grid lines
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(w * 0.4, 0);
  ctx.lineTo(w * 0.4, h);
  ctx.moveTo(0, h * 0.35);
  ctx.lineTo(w, h * 0.35);
  ctx.stroke();
  
  // Big Color Block
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w * 0.4, h * 0.35);
  
  // Title
  ctx.fillStyle = palette.heading;
  ctx.font = `700 ${w * 0.12}px "Inter", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  wrapText(ctx, t, w * 0.45, h * 0.4, w * 0.5, w * 0.14);
  
  // Author
  ctx.fillStyle = palette.subText;
  ctx.font = `400 ${w * 0.07}px "Inter", sans-serif`;
  ctx.fillText(a.toUpperCase(), w * 0.45, h - (h * 0.1));
};

// Style: Classic Serif
const drawSerif = (ctx, w, h, t, a, color, palette) => {
  // Background (Paper texture simulation)
  ctx.fillStyle = palette.paperAltBg;
  ctx.fillRect(0, 0, w, h);
  
  // Border
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.strokeRect(15, 15, w-30, h-30);
  
  // Title
  ctx.fillStyle = palette.heading;
  ctx.font = `italic 700 ${w * 0.14}px "Literata", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  wrapText(ctx, t, w/2, h/2 - 20, w - 60, w * 0.16);
  
  // Author
  ctx.fillStyle = palette.subText;
  ctx.font = `400 ${w * 0.06}px "Inter", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(a, w/2, h/2 + (h * 0.2));
  
  // Ornament
  ctx.beginPath();
  ctx.moveTo(w/2 - 20, h/2 + (h * 0.1));
  ctx.lineTo(w/2 + 20, h/2 + (h * 0.1));
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
};

// Style: Abstract Shape
const drawAbstract = (ctx, w, h, t, a, color, palette) => {
  // Background
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  
  // Abstract Shapes
  ctx.fillStyle = palette.whiteTranslucent;
  ctx.beginPath();
  ctx.arc(w, 0, w * 0.9, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = palette.blackTranslucent;
  ctx.beginPath();
  ctx.arc(0, h, w * 0.7, 0, Math.PI * 2);
  ctx.fill();
  
  // Title
  ctx.fillStyle = palette.white;
  ctx.font = `800 ${w * 0.14}px "Inter", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  wrapText(ctx, t, 20, h - (h * 0.2), w - 40, w * 0.15);
  
  // Author
  ctx.fillStyle = palette.whiteMuted;
  ctx.font = `500 ${w * 0.07}px "Literata", serif`;
  ctx.fillText(a, 20, h - 30);
};

const BookCoverPro = ({ 
  title = "Untitled", 
  author = "Unknown Author", 
  style = 'swiss', // swiss, serif, abstract
  width = 200, 
  height = 300, 
  baseColor = '#A65D57',
  className = ''
}) => {
  const canvasRef = useRef(null);
  const { token } = theme.useToken();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    // Increase resolution for retina displays
    const dpr = window.devicePixelRatio || 1;
    
    // Set display size (css pixels)
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    
    // Set actual size in memory (scaled to account for extra pixel density)
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    // Normalize coordinate system to use css pixels
    ctx.scale(dpr, dpr);
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Define theme-driven palette
    const palette = {
      paperBg: token.colorBgContainer,
      paperAltBg: token.colorBgLayout,
      heading: token.colorTextHeading,
      subText: token.colorTextTertiary,
      grid: token.colorBorderSecondary,
      white: token.colorWhite,
      whiteMuted: 'rgba(255,255,255,0.9)',
      whiteTranslucent: 'rgba(255,255,255,0.15)',
      blackTranslucent: 'rgba(0,0,0,0.1)',
    };

    // Draw based on style
    switch (style) {
      case 'swiss':
        drawSwiss(ctx, width, height, title, author, baseColor, palette);
        break;
      case 'serif':
        drawSerif(ctx, width, height, title, author, baseColor, palette);
        break;
      case 'abstract':
        drawAbstract(ctx, width, height, title, author, baseColor, palette);
        break;
      default:
        drawSwiss(ctx, width, height, title, author, baseColor, palette);
    }
  }, [title, author, style, width, height, baseColor, token]);

  return (
    <canvas 
      ref={canvasRef} 
      className={`book-cover-pro ${className}`}
      style={{ 
        width: width, 
        height: height, 
        borderRadius: 4, 
        boxShadow: token.boxShadowSecondary,
        background: token.colorBgContainer,
        display: 'block' // Remove inline-block gap
      }} 
    />
  );
};

export default BookCoverPro;
