import { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Chatbot } from './components/Chatbot/Chatbot';
import { uiService } from './services/uiService';
import { cartService } from './services/cartService';
import { notificationService } from './services/notificationService';
import { authService } from './services/authService';

function App() {
  useEffect(() => {
    const initializeServices = () => {
      console.log('Initializing services...'); // Debug
      try {
        // First render auth components
        cartService.restoreCart();
        notificationService.initialize();
        authService.initialize();

        // Then initialize UI service after a slight delay to ensure DOM is ready
        setTimeout(() => {
          uiService.initialize();
          console.log('All services initialized'); // Debug
        }, 100);

        // Setup global event listeners
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
            uiService.hideAllOverlays();
          }
        };

        const handleOverlayClick = (e: MouseEvent) => {
          const target = e.target as HTMLElement;
          if (target.classList.contains('form-overlay')) {
            uiService.hideAllOverlays();
          }
        };

        // Handle ESC key
        document.addEventListener('keydown', handleKeyDown);

        // Handle overlay clicks
        document.addEventListener('click', handleOverlayClick);

        // Back to top visibility
        window.addEventListener('scroll', () => {
          const backToTop = document.querySelector('.back-to-top');
          if (backToTop instanceof HTMLElement) {
            backToTop.classList.toggle('visible', window.scrollY > 200);
          }
        });

      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeServices();

    // Cleanup
    return () => {
      document.removeEventListener('keydown', (e) => {
        if (e.key === 'Escape') uiService.hideAllOverlays();
      });
      document.removeEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('form-overlay')) {
          uiService.hideAllOverlays();
        }
      });
    };
  }, []);

  return (
    <BrowserRouter>
      <Layout />
      <Chatbot />
    </BrowserRouter>
  );
}

export default App;