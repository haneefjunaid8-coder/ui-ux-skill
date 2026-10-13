import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import './styles/index.css';
import { App } from './app/App';
import { registerServiceWorker } from './app/pwa';

registerServiceWorker();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('ROOT-X: the #root element is missing from index.html.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
