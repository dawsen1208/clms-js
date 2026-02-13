export const theme = {
  token: {
    // Brand Colors (Warm Editorial)
    colorPrimary: '#A65D57', // Dried Rose / Clay (Warm, sophisticated)
    colorInfo: '#A65D57',
    colorSuccess: '#6B8E23', // Olive Green (Natural)
    colorWarning: '#DAA520', // Goldenrod (Brass-like)
    colorError: '#BC4B51',   // Muted Red
    
    // Backgrounds (Paper / Warm)
    colorBgLayout: '#FAF9F6', // Off-white / Cream
    colorBgContainer: '#FFFFFF',
    colorBorderSecondary: '#EBE9E4', // Warm grey
    
    // Typography
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontFamilyCode: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace",
    
    fontSizeHeading1: 40, // Editorial Scale
    fontSizeHeading2: 28,
    fontSizeHeading3: 22,
    fontSizeHeading4: 18,
    fontSize: 15, // Slightly larger body for readability
    
    // Spacing & Radius
    borderRadius: 6, // Sharper, more print-like
    borderRadiusLG: 12,
    
    // Shadows (Soft, diffused)
    boxShadow: '0 6px 24px rgba(140, 130, 120, 0.08)',
    boxShadowSecondary: '0 2px 8px rgba(140, 130, 120, 0.06)',
    
    controlHeight: 44, // Taller inputs/buttons
    controlHeightLG: 52,
  },
  components: {
    Layout: {
      bodyBg: '#FAF9F6',
      headerBg: '#FAF9F6', // Seamless header
      siderBg: '#FAF9F6',
    },
    Typography: {
      fontFamilyHeading: "'Literata', serif", // Serif for headings
      titleMarginBottom: '0.8em',
      fontWeightStrong: 600,
    },
    Card: {
      colorBgContainer: '#FFFFFF',
      borderRadiusLG: 12,
      boxShadowTertiary: '0 4px 20px rgba(140, 130, 120, 0.04)', // Very subtle paper shadow
      paddingLG: 32, // Spacious padding
    },
    Button: {
      fontWeight: 500,
      borderRadius: 6,
      primaryShadow: '0 4px 12px rgba(166, 93, 87, 0.25)', // Colored shadow for primary
      defaultBorderColor: '#D8D4CF',
      defaultColor: '#4A4A4A',
    },
    Input: {
      colorBgContainer: '#FFFFFF',
      activeBorderColor: '#A65D57',
      hoverBorderColor: '#C48B86',
      borderRadius: 6,
      paddingBlock: 8, // Taller inputs
    },
    Table: {
      headerBg: 'transparent', // Minimalist headers
      headerColor: '#666',
      headerSplitColor: 'transparent',
      borderColor: '#F0EFE9',
      rowHoverBg: '#F7F5F0',
    },
    Tag: {
      borderRadius: 4,
      defaultBg: '#F5F3EF',
      defaultColor: '#5C5C5C',
    },
    Menu: {
      itemSelectedColor: '#A65D57',
      itemSelectedBg: '#F2EBEB', // Very light pink/clay tint
      itemHoverBg: 'transparent', // Text-only hover effect often looks better in editorial
      activeBarBorderWidth: 0, // No border strip
    }
  }
};
