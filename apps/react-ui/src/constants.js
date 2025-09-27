export const API_BASE = (() => {
  const env = (import.meta.env.VITE_API_BASE || '').trim();
  const isLocal = /(?:^|\/\/)(localhost|127\.0\.0\.1)(?::|\/|$)/i.test(env);
  if (env && !isLocal) return env.replace(/\/$/, '');
  return `${window.location.protocol}//${window.location.hostname}:8000`;
})();
