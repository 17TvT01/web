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
            this.currentUser = JSON.parse(savedUser);
            uiService.updateUserUI(this.currentUser);
        }
    }

    handleLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const email = form.querySelector<HTMLInputElement>('input[type="text"]')?.value;
        const password = form.querySelector<HTMLInputElement>('input[type="password"]')?.value;

        // Mock login - replace with actual API call
        if (email && password) {
            // Simulating successful login
            this.currentUser = {
                id: '1',
                name: 'Người dùng',
                email: email,
            };

            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            uiService.updateUserUI(this.currentUser);
            uiService.hideForm('login');
            
            notificationService.show('Đăng nhập thành công!', {
                type: 'success',
                duration: 3000
            });
        }
    }

    handleRegister(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const name = form.querySelector<HTMLInputElement>('input[placeholder="Họ và tên"]')?.value;
        const email = form.querySelector<HTMLInputElement>('input[type="email"]')?.value;
        const password = form.querySelectorAll<HTMLInputElement>('input[type="password"]')[0]?.value;
        const confirmPassword = form.querySelectorAll<HTMLInputElement>('input[type="password"]')[1]?.value;

        if (password !== confirmPassword) {
            notificationService.show('Mật khẩu không khớp!', {
                type: 'error',
                duration: 3000
            });
            return;
        }

        // Mock registration - replace with actual API call
        if (name && email && password) {
            uiService.hideForm('register');
            uiService.showForm('login');
            
            notificationService.show('Đăng ký thành công! Vui lòng đăng nhập.', {
                type: 'success',
                duration: 3000
            });
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