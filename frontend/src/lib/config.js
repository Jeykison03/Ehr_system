export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://knbtifrtswccfxnoaymv.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_wpzK9ny7mIeUermZDefzkQ_oPUsr6Pi';

// API_BASE strategy:
//  • Local Vite dev server (npm run dev)  → http://localhost:8000  (direct)
//  • Docker / GitHub Codespaces           → ''  (relative URL)
//    Nginx running in the frontend container proxies /auth, /patients, etc.
//    to http://backend:8000 over the internal Docker network.
//    This means only ONE port (5173) ever needs to be forwarded in Codespaces.
export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : '');




