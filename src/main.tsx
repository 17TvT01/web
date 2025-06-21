import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global utilities
import './utils/global';

// Import CSS in correct order
import './assets/css/styles.css';

// Initialize app
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Root element not found');
}

const initializeApp = () => {
    console.log('Mounting React application...'); // Debug
    const root = ReactDOM.createRoot(rootElement);
    
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
};

// Wait for document to be ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Debug global handlers
console.log('Global handlers initialized:', {
    handleLogin: typeof window.handleLogin === 'function',
    handleRegister: typeof window.handleRegister === 'function',
    toggleChatbot: typeof window.toggleChatbot === 'function',
    sendMessage: typeof window.sendMessage === 'function',
    scrollToTop: typeof window.scrollToTop === 'function',
});