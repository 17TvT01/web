import { useEffect } from 'react';
import { Layout } from './components/Layout/Layout';
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

  return <Layout />;
}

// Global form handlers
window.handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  try {
    const form = e.currentTarget;
    const email = form.querySelector<HTMLInputElement>('input[type="text"]')?.value;
    const password = form.querySelector<HTMLInputElement>('input[type="password"]')?.value;

    if (!email || !password) {
      notificationService.show('Vui lòng nhập đầy đủ thông tin!', { type: 'error' });
      return;
    }

    // Mock login success
    notificationService.show('Đăng nhập thành công!', { type: 'success' });
    uiService.hideForm('login');

  } catch (error) {
    console.error('Login error:', error);
    notificationService.show('Đăng nhập thất bại!', { type: 'error' });
  }
};

window.handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
  try {
    const form = e.currentTarget;
    const name = form.querySelector<HTMLInputElement>('input[placeholder="Họ và tên"]')?.value;
    const email = form.querySelector<HTMLInputElement>('input[type="email"]')?.value;
    const password = form.querySelectorAll<HTMLInputElement>('input[type="password"]')[0]?.value;
    const confirmPassword = form.querySelectorAll<HTMLInputElement>('input[type="password"]')[1]?.value;

    if (!name || !email || !password || !confirmPassword) {
      notificationService.show('Vui lòng nhập đầy đủ thông tin!', { type: 'error' });
      return;
    }

    if (password !== confirmPassword) {
      notificationService.show('Mật khẩu không khớp!', { type: 'error' });
      return;
    }

    // Mock register success
    notificationService.show('Đăng ký thành công! Vui lòng đăng nhập.', { type: 'success' });
    uiService.hideForm('register');
    setTimeout(() => uiService.showForm('login'), 500);

  } catch (error) {
    console.error('Register error:', error);
    notificationService.show('Đăng ký thất bại!', { type: 'error' });
  }
};

export default App;