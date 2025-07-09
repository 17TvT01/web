import React, { FormEvent } from 'react';
import { authService } from '../../services/authService';
import { uiService } from '../../services/uiService';
import '../../assets/Css/auth.css';
import '../../assets/Css/components/auth-header.css';

export const Login: React.FC = () => {
    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        authService.handleLogin(e);
    };

    return (
        <div className="form-overlay login-form" id="login-form">
            <div className="auth-form">
                <div className="form-header">
                    <h2>Đăng nhập</h2>
                    <button 
                        type="button" 
                        className="close-form"
                        onClick={() => uiService.hideForm('login')}
                    >
                        ×
                    </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="login-email">Email</label>
                        <input 
                            type="email"
                            id="login-email"
                            className="form-control"
                            placeholder="Nhập email của bạn"
                            required 
                        />
                    </div>

                    <div className="form-group password-field">
                        <label htmlFor="login-password">Mật khẩu</label>
                        <input 
                            type="password"
                            id="login-password"
                            className="form-control"
                            placeholder="Nhập mật khẩu"
                            required 
                        />
                    </div>

                    <div className="form-buttons">
                        <button type="submit" className="submit-btn">
                            Đăng nhập
                        </button>
                    </div>
                </form>

                <div className="switch-form">
                    Chưa có tài khoản?
                    <a href="#" onClick={(e) => {
                        e.preventDefault();
                        uiService.hideForm('login');
                        setTimeout(() => uiService.showForm('register'), 300);
                    }}>
                        Đăng ký ngay
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Login;