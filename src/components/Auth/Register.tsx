import React, { FormEvent } from 'react';
import { authService } from '../../services/authService';
import { uiService } from '../../services/uiService';
import '../../assets/Css/auth.css';
import '../../assets/Css/components/auth-header.css';

export const Register: React.FC = () => {
    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        authService.handleRegister(e);
    };

    return (
        <div className="form-overlay register-form" id="register-form">
            <div className="auth-form">
                <div className="form-header">
                    <h2>Đăng ký</h2>
                    <button 
                        type="button" 
                        className="close-form"
                        onClick={() => uiService.hideForm('register')}
                    >
                        ×
                    </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="register-name">Họ và tên</label>
                        <input 
                            type="text"
                            id="register-name"
                            className="form-control"
                            placeholder="Nhập họ và tên"
                            required 
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="register-email">Email</label>
                        <input 
                            type="email"
                            id="register-email"
                            className="form-control"
                            placeholder="Nhập email"
                            required 
                        />
                    </div>

                    <div className="form-group password-field">
                        <label htmlFor="register-password">Mật khẩu</label>
                        <input 
                            type="password"
                            id="register-password"
                            className="form-control"
                            placeholder="Nhập mật khẩu"
                            required 
                        />
                    </div>

                    <div className="form-group password-field">
                        <label htmlFor="register-confirm">Xác nhận mật khẩu</label>
                        <input 
                            type="password"
                            id="register-confirm"
                            className="form-control"
                            placeholder="Nhập lại mật khẩu"
                            required 
                        />
                    </div>

                    <div className="form-buttons">
                        <button type="submit" className="submit-btn">
                            Đăng ký
                        </button>
                    </div>
                </form>

                <div className="switch-form">
                    Đã có tài khoản?
                    <a href="#" onClick={(e) => {
                        e.preventDefault();
                        uiService.hideForm('register');
                        setTimeout(() => uiService.showForm('login'), 300);
                    }}>
                        Đăng nhập
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Register;