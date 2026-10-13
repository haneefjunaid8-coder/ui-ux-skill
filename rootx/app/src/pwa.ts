/* PWA registration — makes the compiled app installable ("Add to Home Screen").
 * Production only (the dev server has no service worker). Failures are silent
 * by design: inside sandboxed iframes registration is blocked, and the app
 * must never depend on the SW to function. */
export function registerPwa() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* not installable here (iframe/preview) — the app still works online */
    });
  });
}
