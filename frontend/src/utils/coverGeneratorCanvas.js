// Generates a book cover image data URL using Canvas
export const generateCover = (title, author, width = 200, height = 300, seed = '') => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return '';

  // Seeded random helper
  const random = (seedStr) => {
    let hash = 0;
    const str = seedStr + seed; // Combine with optional seed
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(Math.sin(hash) * 10000) % 1;
  };

  const rand = random(title + author);

  // Background Colors (Warm/Editorial Palette)
  const backgrounds = [
    ['#FDFCF0', '#E6CCB2'], // Paper
    ['#2C3E50', '#34495E'], // Dark Blue
    ['#606C38', '#283618'], // Olive
    ['#BC6C25', '#DDA15E'], // Earthy Orange
    ['#8D99AE', '#2B2D42'], // Cool Grey
    ['#A5A58D', '#6B705C'], // Sage
    ['#B5838D', '#6D6875'], // Muted Rose
    ['#E5989B', '#B5838D'], // Pink
  ];
  
  const bgIndex = Math.floor(rand * backgrounds.length);
  const [color1, color2] = backgrounds[bgIndex];

  // Draw Gradient Background
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Add Texture/Noise (Subtle)
  ctx.globalAlpha = 0.05;
  for (let i = 0; i < width; i += 2) {
    for (let j = 0; j < height; j += 2) {
      if (Math.random() > 0.5) {
        ctx.fillStyle = '#000';
        ctx.fillRect(i, j, 1, 1);
      }
    }
  }
  ctx.globalAlpha = 1.0;

  // Design Patterns (Geometric Shapes)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  const patternType = Math.floor(rand * 4);
  
  if (patternType === 0) {
    // Circle
    ctx.beginPath();
    ctx.arc(width / 2, height / 3, width * 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (patternType === 1) {
    // Diagonal Line
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, height * 0.5);
    ctx.lineTo(0, height * 1.5);
    ctx.fill();
  } else if (patternType === 2) {
    // Rectangles
    ctx.fillRect(20, 20, width - 40, height - 40);
  }

  // Text Styling
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  
  // Title
  // Simple word wrapping
  const words = title.split(' ');
  let line = '';
  const lines = [];
  const maxWidth = width - 40;
  const fontSize = Math.max(16, width / 10);
  ctx.font = `bold ${fontSize}px 'Literata', serif`;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      lines.push(line);
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }
  lines.push(line);

  let y = height / 2 - (lines.length * fontSize) / 2;
  
  // Drop shadow for text
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  lines.forEach((l) => {
    ctx.fillText(l.trim(), width / 2, y);
    y += fontSize * 1.2;
  });

  // Author
  ctx.font = `italic ${fontSize * 0.6}px 'Inter', sans-serif`;
  ctx.fillText(author, width / 2, height - 30);

  return canvas.toDataURL();
};
