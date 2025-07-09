import { FormEvent } from 'react';
import { uiService } from './uiService';
import { notificationService } from './notificationService';

interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

class AuthService {
    private currentUser: User | null = null;

    initialize() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            const parsedUser = JSON.parse(savedUser);
            // Đảm bảo người dùng có avatar mặc định nếu không có avatar
            this.currentUser = {
                ...parsedUser,
                avatar: parsedUser.avatar || '/images/default-avatar.svg'
            };
            uiService.updateUserUI(this.currentUser);
        }
    }

    async handleLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const email = form.querySelector<HTMLInputElement>('input[type="text"], input[type="email"]')?.value;
        const password = form.querySelector<HTMLInputElement>('input[type="password"]')?.value;

        if (!email || !password) {
            notificationService.show('Vui lòng nhập đầy đủ thông tin!', { type: 'error', duration: 3000 });
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();
            if (response.ok) {
                // Đảm bảo người dùng có avatar mặc định nếu không có avatar
                this.currentUser = {
                    ...data,
                    avatar: data.avatar || '/images/default-avatar.svg'
                };
                localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                uiService.updateUserUI(this.currentUser);
                uiService.hideForm('login');
                notificationService.show('Đăng nhập thành công!', { type: 'success', duration: 3000 });
            } else {
                notificationService.show(data.error || 'Đăng nhập thất bại!', { type: 'error', duration: 3000 });
            }
        } catch (error) {
            notificationService.show('Lỗi kết nối máy chủ!', { type: 'error', duration: 3000 });
        }
    }

    async handleRegister(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        // Debug logs
        console.log('Form:', form);
        console.log('Name field:', form.querySelector('#register-name')?.value);
        console.log('Email field:', form.querySelector('#register-email')?.value);
        console.log('Password field:', form.querySelector('#register-password')?.value);
        console.log('Confirm field:', form.querySelector('#register-confirm')?.value);
        const name = (form.querySelector('#register-name') as HTMLInputElement | null)?.value;
        const email = (form.querySelector('#register-email') as HTMLInputElement | null)?.value;
        const password = (form.querySelector('#register-password') as HTMLInputElement | null)?.value;
        const confirmPassword = (form.querySelector('#register-confirm') as HTMLInputElement | null)?.value;

        if (password !== confirmPassword) {
            notificationService.show('Mật khẩu không khớp!', { type: 'error', duration: 3000 });
            return;
        }
        if (!name || !email || !password) {
            notificationService.show('Vui lòng nhập đầy đủ thông tin!', { type: 'error', duration: 3000 });
            return;
        }
        try {
            const response = await fetch('http://localhost:5000/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await response.json();
            if (response.ok) {
                uiService.hideForm('register');
                uiService.showForm('login');
                notificationService.show('Đăng ký thành công! Vui lòng đăng nhập.', { type: 'success', duration: 3000 });
            } else {
                notificationService.show(data.error || 'Đăng ký thất bại!', { type: 'error', duration: 3000 });
            }
        } catch (error) {
            notificationService.show('Lỗi kết nối máy chủ!', { type: 'error', duration: 3000 });
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        uiService.resetUserUI();
        
        notificationService.show('Đã đăng xuất!', {
            type: 'info',
            duration: 3000
        });
    }

    getCurrentUser(): User | null {
        return this.currentUser;
    }
}

export const authService = new AuthService();