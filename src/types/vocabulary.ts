
export interface Vocabulary {
    id: number;
    word: string;
    partOfSpeech?: string;
    meaning: string;
    pronunciation: string;
    example: string;
}

export interface ApiResponse<T> {
    status: string;
    message: string;
    data: T;
}
export interface Vocabulary {
    id: number;
    word: string;
    partOfSpeech?: string;
    meaning: string;
    pronunciation: string;
    example: string;
}

export interface ApiResponse<T> {
    status: string;
    message: string;
    data: T;
}

// 👇 THÊM ĐOẠN NÀY VÀO CUỐI FILE ĐỂ HẾT LỖI IMPORT 👇
export interface QuizQuestion {
    wordId: number;
    question: string;     // Từ tiếng Anh
    options: string[];    // 4 đáp án
    correctAnswer: string; // Đáp án đúng
}