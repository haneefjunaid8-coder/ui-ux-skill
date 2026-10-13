import '@testing-library/jest-dom/vitest';

// jsdom does not implement scrolling; stub it so hash-navigation code can run.
Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: () => {},
});
window.scrollTo = (() => {}) as typeof window.scrollTo;
