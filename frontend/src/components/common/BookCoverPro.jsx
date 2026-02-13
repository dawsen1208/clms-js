import React, { useRef, useEffect } from 'react';

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const scale = window.devicePixelRatio || 1;
    
    // Set high resolution
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw based on style
    switch (style) {
      case 'swiss':
        drawSwiss(ctx, width, height, title, author, baseColor);
        break;
      case 'serif':
        drawSerif(ctx, width, height, title, author, baseColor);
        break;
      case 'abstract':
        drawAbstract(ctx, width, height, title, author, baseColor);
        break;
      default:
        drawSwiss(ctx, width, height, title, author, baseColor);
    }
  }, [title, author, style, width, height, baseColor]);

  // Style: Swiss Minimalist
  const drawSwiss = (ctx, w, h, t, a, color) => {
    // Background
    ctx.fillStyle = '#F5F5F5';
    ctx.fillRect(0, 0, w, h);
    
    // Grid lines
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w/2, 0);
    ctx.lineTo(w/2, h);
    ctx.moveTo(0, h/3);
    ctx.lineTo(w, h/3);
    ctx.stroke();
    
    // Big Color Block
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h/3);
    
    // Title
    ctx.fillStyle = '#111';
    ctx.font = 'bold 24px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    wrapText(ctx, t, 20, h/3 + 20, w - 40, 30);
    
    // Author
    ctx.fillStyle = '#666';
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillText(a.toUpperCase(), 20, h - 40);
  };

  // Style: Classic Serif
  const drawSerif = (ctx, w, h, t, a, color) => {
    // Background (Paper texture simulation)
    ctx.fillStyle = '#FAF9F6';
    ctx.fillRect(0, 0, w, h);
    
    // Border
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(15, 15, w-30, h-30);
    
    // Title
    ctx.fillStyle = color;
    ctx.font = 'italic 700 32px "Literata", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    wrapText(ctx, t, w/2, h/2 - 20, w - 60, 40);
    
    // Author
    ctx.fillStyle = '#333';
    ctx.font = '12px "Inter", sans-serif';
    ctx.fillText(a, w/2, h/2 + 60);
    
    // Ornament
    ctx.beginPath();
    ctx.moveTo(w/2 - 20, h/2 + 40);
    ctx.lineTo(w/2 + 20, h/2 + 40);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  // Style: Abstract Shape
  const drawAbstract = (ctx, w, h, t, a, color) => {
    // Background
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    
    // Abstract Shapes
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.arc(w, 0, w * 0.8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.arc(0, h, w * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Title
    ctx.fillStyle = '#FFF';
    ctx.font = '900 36px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    wrapText(ctx, t, 20, h - 60, w - 40, 40);
    
    // Author
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '14px "Inter", sans-serif';
    ctx.fillText(a, 20, h - 30);
  };

  // Helper: Wrap Text
  const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(' ');
    let line = '';
    let testLine = '';
    let lineCount = 0;

    for(let n = 0; n < words.length; n++) {
      testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, y);
        line = words[n] + ' ';
        y += lineHeight;
        lineCount++;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  };

  return (
    <canvas 
      ref={canvasRef} 
      className={`book-cover-pro ${className}`}
      style={{ 
        width: width, 
        height: height, 
        borderRadius: 4, 
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        background: '#fff'
      }} 
    />
  );
};

export default BookCoverPro;
