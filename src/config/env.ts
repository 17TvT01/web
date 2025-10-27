const importMetaEnv = (typeof import.meta !== 'undefined' && (import.meta as any)?.env) || {};
const processEnv = (typeof process !== 'undefined' && (process as any)?.env) || {};

const rawApiBaseUrl =
    importMetaEnv.VITE_API_BASE_URL ||
    processEnv.VITE_API_BASE_URL ||
    'https://l0nbfv70-5000.asse.devtunnels.ms/';

const normalizeBaseUrl = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) {
        return 'http://localhost:5000';
    }
    return trimmed.replace(/\/$/, '');
};

export const API_BASE_URL = normalizeBaseUrl(String(rawApiBaseUrl));
