// Utility to handle image URLs properly
// Supports local uploads (prepends API base URL) and external URLs

// Determine API Base URL
// Priority:
// 1. VITE_API_BASE environment variable
// 2. Fallback to /api (for proxy) or explicit backend URL if needed
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

// For static hosting (like Azure Static Web Apps), /api is proxied to backend function.
// But for uploads served by backend static middleware (e.g. express.static('/uploads')),
// we need the full backend URL if the frontend and backend are on different domains 
// and no proxy is set up for /uploads.

// However, typically in this project configuration:
// - Frontend: Azure Static Web Apps (or Storage)
// - Backend: Azure App Service
// The frontend likely needs the full backend URL for images if they are not proxied.

// Let's try to infer the backend origin if API_BASE is a full URL.
const getBackendOrigin = () => {
  if (API_BASE.startsWith("http")) {
    try {
      const url = new URL(API_BASE);
      return url.origin;
    } catch (e) {
      return "";
    }
  }
  return ""; // Relative path, implies same origin or proxy
};

const BACKEND_ORIGIN = getBackendOrigin();

/**
 * Transforms a raw image URL/path into a usable URL.
 * @param {string} url - The raw URL from database (e.g., "/uploads/file.jpg", "http://...", "uploads/file.jpg")
 * @returns {string} The resolved URL
 */
export const getCleanImageUrl = (url) => {
  if (!url) return "";
  
  // If it's a data URI or blob, return as is
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  // If it's already a full HTTP URL
  if (url.startsWith("http://") || url.startsWith("https://")) {
    // Fix localhost issue if present (optional, legacy data cleanup)
    if (url.includes("localhost:5000") && window.location.hostname !== "localhost") {
       // If we have a known backend origin, replace localhost with it
       if (BACKEND_ORIGIN) {
         return url.replace(/http:\/\/localhost:5000/, BACKEND_ORIGIN);
       }
    }
    return url;
  }

  // Handle relative paths (e.g., "uploads/foo.jpg" or "/uploads/foo.jpg")
  // If the path starts with /uploads or uploads/, we assume it's hosted by the backend.
  if (url.includes("uploads/")) {
    const cleanPath = url.startsWith("/") ? url : `/${url}`;
    
    // If API_BASE is a full URL (e.g. https://api.site.com/api), we need https://api.site.com/uploads/...
    if (BACKEND_ORIGIN) {
      return `${BACKEND_ORIGIN}${cleanPath}`;
    }
    
    // If API_BASE is relative (e.g. /api), and we are on dev with proxy, 
    // we might need to check if /uploads is proxied. 
    // Usually Vite proxy config handles /api, but maybe not /uploads.
    // Assuming backend serves /uploads at root level.
    
    // Fallback: if in production (frontend domain != backend domain) and no proxy for uploads,
    // this might still fail if we return just '/uploads/...'
    
    // BEST GUESS: If API_BASE is set to a URL, use its origin.
    // If not, return relative path and hope for proxy or same-origin.
    return cleanPath;
  }

  return url;
};
