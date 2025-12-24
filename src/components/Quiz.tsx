import React, { useState, useEffect } from 'react'; // Đã bỏ useRef
import { getQuiz, completeDay } from '../services/api';
import type { QuizQuestion, ApiResponse } from '../types/vocabulary';

interface Props {
    day: number;
    onBack: () => void;
    onPass: () => void;
}

const Quiz: React.FC<Props> = ({ day, onBack, onPass }) => {
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [loading, setLoading] = useState(true);
    
    // State xử lý hiệu ứng "Ai là triệu phú"
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [answerStatus, setAnswerStatus] = useState<'selecting' | 'confirming' | 'revealed'>('selecting'); 

    // Âm thanh (Optional)
    const playSound = (type: 'wait' | 'correct' | 'wrong') => {
        // const audio = new Audio(`/sounds/${type}.mp3`);
        // audio.play().catch(() => {});
    };

    useEffect(() => {
        fetchQuiz();
    }, [day]);

    const fetchQuiz = async () => {
        try {
            const res = await getQuiz(day);
            const payload = res.data as ApiResponse<QuizQuestion[]>;
            // Kiểm tra nếu API trả về danh sách rỗng (tránh lỗi crash)
            if (payload.data && payload.data.length > 0) {
                setQuestions(payload.data);
            } else {
                alert("Ngày này chưa có đủ từ vựng để tạo bài thi!");
                onBack();
            }
        } catch (e) {
            alert("Lỗi tải đề thi hoặc kết nối server!");
            onBack();
        } finally {
            setLoading(false);
        }
    };

    const handleSelectOption = (answer: string) => {
        if (answerStatus !== 'selecting') return;

        setSelectedAnswer(answer);
        setAnswerStatus('confirming');
        playSound('wait');

        setTimeout(() => {
            setAnswerStatus('revealed');
            const isCorrect = answer === questions[currentIndex].correctAnswer;
            
            if (isCorrect) {
                setScore(s => s + 1);
                playSound('correct');
            } else {
                playSound('wrong');
            }

            setTimeout(() => {
                if (currentIndex < questions.length - 1) {
                    setCurrentIndex(curr => curr + 1);
                    setSelectedAnswer(null);
                    setAnswerStatus('selecting');
                } else {
                    finishQuiz(score + (isCorrect ? 1 : 0));
                }
            }, 2000);

        }, 2000);
    };

    const finishQuiz = async (finalScore: number) => {
        setShowResult(true);
        const passThreshold = Math.ceil(questions.length * 0.8);
        if (finalScore >= passThreshold) {
            await completeDay(day);
        }
    };

    const getButtonColor = (option: string) => {
        if (selectedAnswer === null) return "bg-slate-900 border-slate-500 text-white hover:bg-orange-500";
        
        if (option === selectedAnswer) {
            if (answerStatus === 'confirming') return "bg-orange-500 border-white text-white animate-pulse";
            if (answerStatus === 'revealed') {
                return option === questions[currentIndex].correctAnswer 
                    ? "bg-green-600 border-white text-white shadow-[0_0_20px_rgba(34,197,94,0.8)]"
                    : "bg-red-600 border-white text-white";
            }
        }

        if (answerStatus === 'revealed' && option === questions[currentIndex].correctAnswer) {
            return "bg-green-600 border-white text-white animate-bounce";
        }

        return "bg-slate-900 border-slate-700 text-slate-500 opacity-50";
    };

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Đang tải đề thi...</div>;

    // --- MÀN HÌNH KẾT QUẢ ---
    if (showResult) {
        const isPassed = score >= Math.ceil(questions.length * 0.8);
        return (
            <div className="min-h-screen bg-gradient-to-b from-blue-900 to-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
                <div className="text-6xl mb-6">{isPassed ? '🏆' : '🤦'}</div>
                <h2 className="text-4xl font-bold mb-2 text-yellow-400 uppercase">{isPassed ? 'Chúc mừng!' : 'Rất tiếc!'}</h2>
                <p className="text-lg mb-8">Bạn đã trả lời đúng <span className="text-yellow-400 font-bold text-2xl">{score}/{questions.length}</span> câu hỏi.</p>
                
                {isPassed ? (
                    <div className="bg-green-500/20 border border-green-500 p-4 rounded-xl mb-8">
                        <p className="font-bold text-green-400">BẠN ĐÃ MỞ KHÓA NGÀY TIẾP THEO!</p>
                    </div>
                ) : (
                    <div className="bg-red-500/20 border border-red-500 p-4 rounded-xl mb-8">
                        <p className="text-red-300">Bạn cần đúng 80% để qua màn. Hãy ôn lại nhé!</p>
                    </div>
                )}

                <div className="flex gap-4">
                    <button onClick={onBack} className="px-6 py-3 border-2 border-slate-500 rounded-full hover:bg-slate-800 transition">Thoát</button>
                    {isPassed 
                        ? <button onClick={onPass} className="px-8 py-3 bg-yellow-500 text-black font-bold rounded-full hover:bg-yellow-400 shadow-lg shadow-yellow-500/50 transition">Tiếp tục</button>
                        : <button onClick={() => window.location.reload()} className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-full hover:bg-indigo-500 shadow-lg transition">Thi lại</button>
                    }
                </div>
            </div>
        );
    }

    // --- MÀN HÌNH GAME SHOW ---
    const currentQ = questions[currentIndex];

    // 👇 QUAN TRỌNG: Kiểm tra nếu currentQ bị undefined thì không vẽ gì cả (Tránh lỗi crash)
    if (!currentQ) return <div className="text-white text-center mt-20">Đang tải câu hỏi...</div>;

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-slate-900 to-black flex flex-col items-center justify-center p-4 font-sans text-white">
            
            {/* Logo */}
            <div className="mb-8">
                <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center border-4 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.5)] mx-auto mb-4">
                    <i className="fas fa-question text-4xl text-white"></i>
                </div>
                <div className="flex items-center gap-2 justify-center">
                    <span className="px-4 py-1 bg-blue-800 rounded-full border border-blue-500 text-sm font-bold text-blue-200">
                        Câu {currentIndex + 1} / {questions.length}
                    </span>
                </div>
            </div>

            {/* Khung Câu Hỏi */}
            <div className="w-full max-w-2xl relative mb-8 group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-slate-900 border-2 border-yellow-500 rounded-xl p-8 text-center shadow-2xl">
                    <div className="absolute top-1/2 left-0 w-4 h-[2px] bg-yellow-500"></div>
                    <div className="absolute top-1/2 right-0 w-4 h-[2px] bg-yellow-500"></div>
                    
                    <h3 className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
                        "{currentQ.question}" nghĩa là gì?
                    </h3>
                </div>
            </div>

            {/* Lưới Đáp Án */}
            <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQ.options.map((opt, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSelectOption(opt)}
                        disabled={answerStatus !== 'selecting'}
                        className={`
                            relative py-4 px-6 rounded-full border-2 text-left font-semibold text-lg transition-all duration-300
                            flex items-center gap-3 group
                            ${getButtonColor(opt)}
                        `}
                    >
                        <span className={`font-bold text-yellow-500 group-hover:text-white`}>
                            {String.fromCharCode(65 + idx)}:
                        </span>
                        <span className="flex-1">{opt}</span>
                        
                        <div className="absolute top-1/2 left-2 w-1 h-1 bg-white rounded-full opacity-50"></div>
                        <div className="absolute top-1/2 right-2 w-1 h-1 bg-white rounded-full opacity-50"></div>
                    </button>
                ))}
            </div>

            <button onClick={onBack} className="mt-12 text-slate-500 hover:text-white text-sm flex items-center gap-2">
                <i className="fas fa-sign-out-alt"></i> Dừng cuộc chơi
            </button>
        </div>
    );
};

export default Quiz;