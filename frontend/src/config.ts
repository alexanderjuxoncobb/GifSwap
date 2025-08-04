// In production, the API is on the same domain
// In development, it's on localhost:3001
export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? '' : 'http://localhost:3001');