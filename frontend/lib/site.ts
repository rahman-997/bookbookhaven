const FALLBACK_SITE_URL = 'https://bookbookhaven-free.onrender.com';

export const siteUrl = (() => {
  const candidate = process.env.NEXT_PUBLIC_SITE_URL?.trim() || FALLBACK_SITE_URL;
  try {
    return new URL(candidate).toString().replace(/\/$/, '');
  } catch {
    return FALLBACK_SITE_URL;
  }
})();
