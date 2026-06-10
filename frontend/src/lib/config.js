export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://knbtifrtswccfxnoaymv.supabase.co';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_wpzK9ny7mIeUermZDefzkQ_oPUsr6Pi';


// When running via docker-compose, frontend talks to backend service name.
export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000'
    : (typeof window !== 'undefined' && window.location.hostname.endsWith('.app.github.dev')
      ? `https://${window.location.hostname.replace('-5173', '-8000')}`
      : 'http://backend:8000'));



