import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import '@fontsource-variable/manrope';
import '@fontsource-variable/jetbrains-mono';
import './styles/tokens.css';
import './styles/base.css';
import './styles/ds.css';
import { RootXProvider } from './engine/store';
import { registerPwa } from './pwa';
import { ToastProvider } from './ds';
import App from './App';

registerPwa();

// The single-file build runs from file:// (double-clicked), where path-based
// routing cannot work — it uses hash routing instead.
const Router = (() => {
  try {
    return __ROOTX_STANDALONE__ ? HashRouter : BrowserRouter;
  } catch {
    return BrowserRouter;
  }
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootXProvider>
      <ToastProvider>
        <Router>
          <App />
        </Router>
      </ToastProvider>
    </RootXProvider>
  </React.StrictMode>,
);
