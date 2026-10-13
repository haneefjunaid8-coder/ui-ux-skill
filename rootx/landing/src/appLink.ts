/** Link to the ROOT-X prototype app.
 *  In the sandbox preview the landing runs at 5174-<sandbox>.e2b.app and the
 *  app at 5173-<sandbox>.e2b.app — swap the port prefix; locally fall back to
 *  localhost:5173. */
export function appLink(): string {
  const host = typeof window !== 'undefined' ? window.location.host : '';
  if (host.startsWith('5174-')) return `https://${host.replace('5174-', '5173-')}`;
  return 'http://localhost:5173';
}
