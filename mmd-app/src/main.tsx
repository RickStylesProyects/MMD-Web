import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('🚀 [CRITICAL] Starting application mounting...');

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error('❌ [CRITICAL] Root element not found!');
  } else {
    console.log('✅ [CRITICAL] Root element found, mounting React app...');
    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
    console.log('✅ [CRITICAL] React app mount command issued.');
  }
} catch (error) {
  console.error('❌ [CRITICAL] Failed to mount React app:', error);
}
