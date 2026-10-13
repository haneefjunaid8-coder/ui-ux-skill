import { useNavigation } from 'react-router-dom';

/**
 * Thin top bar shown while a route transition (including lazy-loaded pages) is pending.
 * It is purely informational and hidden from assistive tech after the status is announced.
 */
export function NavigationProgress() {
  const navigation = useNavigation();
  const pending = navigation.state !== 'idle';
  if (!pending) {
    return null;
  }
  return (
    <div className="nav-progress" role="status" aria-live="polite">
      <span className="visually-hidden">Loading page</span>
    </div>
  );
}
