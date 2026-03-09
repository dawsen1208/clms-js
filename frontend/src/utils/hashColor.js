/**
 * Hash Color Utilities
 * Generates consistent colors and initials from strings for UI elements like avatars and tags.
 */
// Generate a consistent color from a string
export const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert to hex
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};

// Generate a warm/magazine palette color from a string
// Uses a predefined set of "warm" colors for better aesthetic consistency
export const stringToWarmColor = (str) => {
  const warmPalette = [
    '#B08968', // Brown
    '#7F5539', // Dark Brown
    '#9C6644', // Medium Brown
    '#E6CCB2', // Beige
    '#DDB892', // Tan
    '#606C38', // Dark Olive
    '#283618', // Deep Green
    '#A5A58D', // Sage
    '#D4A373', // Paper Gold
    '#BC6C25', // Deep Orange
    '#FEFAE0', // Cream (Light) - might be too light for text
    '#C1121F', // Deep Red
    '#780000', // Maroon
    '#2F3E46', // Dark Slate
    '#52796F', // Muted Teal
    '#84A98C', // Soft Green
  ];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % warmPalette.length;
  return warmPalette[index];
};

// Generate initials from a name
export const getInitials = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};
