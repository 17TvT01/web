import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { User } from '../../types/auth';
import { notificationService } from '../../services/notificationService';
import { uiService } from '../../services/uiService';
import '../../assets/Css/components/profile.css';

export const Profile: React.FC = () => {
    const user = authService.getCurrentUser() as User;
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');

    if (!user) {
        return (
            <div className="profile-not-logged-in">
                <h2>Bạn chưa đăng nhập</h2>
                <p>Vui lòng đăng nhập để xem thông tin tài khoản</p>
                <button 
                    className="login-btn"
                    onClick={() => {
                        // Hiển thị form đăng nhập thay vì chuyển trang
                        uiService.showForm('login');
                    }}
                >
                    Đăng nhập
                </button>
            </div>
        );
    }

    const handleSaveProfile = () => {
        // Giả lập cập nhật thông tin người dùng
        // Trong thực tế, bạn sẽ gọi API để cập nhật thông tin
        setTimeout(() => {
            notificationService.show('Cập nhật thông tin thành công!', { type: 'success', duration: 3000 });
            setIsEditing(false);
        }, 1000);
    };

    return (
        <div className="profile-container">
            <h2>Thông tin tài khoản</h2>
            
            <div className="profile-content">
                <div className="profile-avatar">
                    <img 
                        src={user.avatar || "/images/default-avatar.svg"} 
                        alt={`${user.name}'s avatar`} 
                    />
                    <button className="change-avatar-btn">
                        <i className="fas fa-camera"></i>
                        Thay đổi
                    </button>
                </div>

                <div className="profile-details">
                    {isEditing ? (
                        <div className="profile-form">
                            <div className="form-group">
                                <label htmlFor="profile-name">Họ và tên</label>
                                <input 
                                    type="text" 
                                    id="profile-name" 
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="profile-email">Email</label>
                                <input 
                                    type="email" 
                                    id="profile-email" 
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled
                                />
                                <small>Email không thể thay đổi</small>
                            </div>
                            <div className="profile-actions">
                                <button 
                                    className="cancel-btn"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setName(user.name);
                                        setEmail(user.email);
                                    }}
                                >
                                    Hủy
                                </button>
                                <button 
                                    className="save-btn"
                                    onClick={handleSaveProfile}
                                >
                                    Lưu thay đổi
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="profile-info">
                            <div className="profile-field">
                                <label>Họ và tên:</label>
                                <span>{user.name}</span>
                            </div>
                            <div className="profile-field">
                                <label>Email:</label>
                                <span>{user.email}</span>
                            </div>
                            <button 
                                className="edit-profile-btn"
                                onClick={() => setIsEditing(true)}
                            >
                                <i className="fas fa-edit"></i>
                                Chỉnh sửa thông tin
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;