import { FormEvent } from 'react';
import { uiService } from '../services/uiService';
import { notificationService } from '../services/notificationService';

declare global {
    interface Window {
        // UI Functions
        toggleChatbot: () => void;
        sendMessage: () => void;
        scrollToTop: () => void;
        togglePasswordVisibility: (inputId: string) => void;
        handleLogin: (e: FormEvent<HTMLFormElement>) => Promise<void>;
        handleRegister: (e: FormEvent<HTMLFormElement>) => Promise<void>;
    }
}

// UI Functions
window.toggleChatbot = () => {
    const chatbot = document.querySelector('.chatbot-content');
    if (chatbot instanceof HTMLElement) {
        const isVisible = chatbot.style.display === 'block';
        chatbot.style.display = isVisible ? 'none' : 'block';
    }
};

window.scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.togglePasswordVisibility = (inputId: string) => {
    const input = document.getElementById(inputId) as HTMLInputElement;
    const button = input?.nextElementSibling as HTMLButtonElement;
    if (input && button) {
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
        const icon = button.querySelector('i');
        if (icon) {
            icon.className = `fas fa-${type === 'password' ? 'eye' : 'eye-slash'}`;
        }
    }
};

// Chat Functions
window.sendMessage = () => {
    const input = document.getElementById('chatInput') as HTMLInputElement;
    const messages = document.querySelector('.chat-messages');

    if (!input || !messages || !input.value.trim()) return;

    // Add user message
    messages.innerHTML += `
        <div class="message user-message">
            <p>${input.value}</p>
            <i class="fas fa-user"></i>
        </div>
    `;

    // Clear input
    const userMessage = input.value;
    input.value = '';

    // Scroll to bottom
    messages.scrollTop = messages.scrollHeight;

    // Simulate bot response
    setTimeout(() => {
        messages.innerHTML += `
            <div class="message bot-message">
                <i className="fas fa-robot"></i>
                <p>Xin lỗi, tôi đang được phát triển và chưa thể trả lời câu hỏi của bạn.</p>
            </div>
        `;
        messages.scrollTop = messages.scrollHeight;
    }, 1000);
};

// Form Handlers
window.handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Login form submitted'); // Debug

    try {
        const form = e.currentTarget;
        const email = (form.querySelector('#login-email') as HTMLInputElement)?.value;
        const password = (form.querySelector('#login-password') as HTMLInputElement)?.value;

        console.log('Login credentials:', { email }); // Debug

        if (!email || !password) {
            notificationService.show('Vui lòng nhập đầy đủ thông tin!', { type: 'error' });
            return;
        }

        // Mock login success
        console.log('Login successful'); // Debug
        notificationService.show('Đăng nhập thành công!', { type: 'success' });
        uiService.hideForm('login');

    } catch (error) {
        console.error('Login error:', error);
        notificationService.show('Đăng nhập thất bại!', { type: 'error' });
    }
};

window.handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Register form submitted'); // Debug

    try {
        const form = e.currentTarget;
        const name = (form.querySelector('#register-name') as HTMLInputElement)?.value;
        const email = (form.querySelector('#register-email') as HTMLInputElement)?.value;
        const password = (form.querySelector('#register-password') as HTMLInputElement)?.value;
        const confirmPassword = (form.querySelector('#register-confirm') as HTMLInputElement)?.value;

        console.log('Register data:', { name, email }); // Debug

        if (!name || !email || !password || !confirmPassword) {
            notificationService.show('Vui lòng nhập đầy đủ thông tin!', { type: 'error' });
            return;
        }

        if (password !== confirmPassword) {
            notificationService.show('Mật khẩu không khớp!', { type: 'error' });
            return;
        }

        // Mock register success
        console.log('Registration successful'); // Debug
        notificationService.show('Đăng ký thành công! Vui lòng đăng nhập.', { type: 'success' });
        uiService.hideForm('register');
        setTimeout(() => uiService.showForm('login'), 500);

    } catch (error) {
        console.error('Register error:', error);
        notificationService.show('Đăng ký thất bại!', { type: 'error' });
    }
};