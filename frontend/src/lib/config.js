export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (() => {
    if (typeof window === 'undefined') return 'http://localhost:8000';
    const hostname = window.location.hostname;
    
    // If running on localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8000';
    }
    
    // If running inside GitHub Codespaces (e.g. *-5173.app.github.dev)
    if (hostname.endsWith('.app.github.dev')) {
      return `https://${hostname.replace('-5173', '-8000')}`;
    }
    
    // Default fallback to same host on port 8000
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  })();


