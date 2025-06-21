import { useEffect } from 'react';
import { Layout } from './components/Layout/Layout';
import { Chatbot } from './components/Chatbot/Chatbot';
import { uiService } from './services/uiService';
import { cartService } from './services/cartService';
import { notificationService } from './services/notificationService';

function App() {
  useEffect(() => {
    const initializeApp = () => {
      console.log('Initializing app...'); // Debug
      try {
        // Initialize services
        uiService.initialize();
        cartService.restoreCart();
        notificationService.initialize();
        
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

        console.log('App initialized successfully'); // Debug

      } catch (error) {
        console.error('Error initializing app:', error);
      }
    };

    initializeApp();

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
    <>
      <Layout />
      <Chatbot />
    </>
  );
}

export default App;