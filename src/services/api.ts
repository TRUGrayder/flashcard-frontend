import axios from 'axios';

// 👇 1. Lấy URL từ biến môi trường Vercel. 
// Nếu không có (chạy local) thì dùng localhost.
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1/vocabularies';

const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

export const getWords = async (day: number, random: boolean = false, includeAll: boolean = false) => {
    return await api.get(`?day=${day}&random=${random}&includeAll=${includeAll}`);
};

export const markMastered = async (id: number) => {
    return await api.post('/master', { id });
};

export const getDaysProgress = async () => {
    return await api.get('/days');
};

export const resetDay = async (day: number) => {
    return await api.post('/reset', { day });
};

// --- API TRẮC NGHIỆM ---

export const getQuiz = async (day: number) => {
    return await api.get(`/quiz?day=${day}`);
};

export const completeDay = async (day: number) => {
    return await api.post('/complete-day', { day });
};

export const askAI = async (word: string) => {
    // 👇 FIX: Vì BASE_URL đang kết thúc bằng /vocabularies,
    // ta cần cắt nó đi để gọi sang endpoint /ai
    const aiBaseURL = BASE_URL.replace('/vocabularies', ''); 
    
    // Gọi trực tiếp bằng axios để dùng baseURL mới cho AI
    return await axios.get(`${aiBaseURL}/ai/explain?word=${word}`);
};

export default api;