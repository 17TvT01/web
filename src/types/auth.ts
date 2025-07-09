export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData extends LoginCredentials {
    name: string;
    confirmPassword: string;
}

export interface AuthResponse {
    user: User;
    token?: string;
    message?: string;
    error?: string;
}