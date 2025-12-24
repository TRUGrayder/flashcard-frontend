import React, { useState, useEffect } from 'react';
import { getWords } from '../services/api';
import type { Vocabulary, ApiResponse } from '../types/vocabulary';
import confetti from 'canvas-confetti';

interface Props {
    day: number;
    onBack: () => void;
}

const SpellingGame: React.FC<Props> = ({ day, onBack }) => {
    const [words, setWords] = useState<Vocabulary[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [userInput, setUserInput] = useState('');
    const [status, setStatus] = useState<'idle' | 'correct' | 'wrong' | 'revealed'>('idle');
    const [loading, setLoading] = useState(true);
    
    // Thống kê
    const [score, setScore] = useState(0);
    const [wrongCount, setWrongCount] = useState(0);
    const [isFinished, setIsFinished] = useState(false);

    // Biến cờ để đánh dấu xem từ hiện tại đã bị phạt chưa (tránh phạt nhiều lần trên 1 từ)
    const [hasPenalized, setHasPenalized] = useState(false);

    useEffect(() => {
        const init = async () => {
            try {
                // Lấy tất cả từ vựng (bao gồm đã thuộc)
                const res = await getWords(day, true, true);
                const data = (res.data as ApiResponse<Vocabulary[]>).data;
                if (!data || data.length === 0) {
                    alert("Chưa có từ vựng nào!");
                    onBack();
                    return;
                }
                setWords(data);
            } catch (error) {
                console.error(error);
                onBack();
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [day]);

    const handleCheck = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        // Nếu đã đúng hoặc đã hiện đáp án thì bấm Enter sẽ là Next
        if (status === 'correct' || status === 'revealed') {
            handleNext();
            return;
        }

        const currentWordObj = words[currentIndex];
        const targetWord = currentWordObj.word.trim().toLowerCase();
        const input = userInput.trim().toLowerCase();

        if (input === targetWord) {
            // --- TRƯỜNG HỢP ĐÚNG ---
            setStatus('correct');
            // Nếu chưa bị phạt lần nào thì mới cộng điểm cao
            if (!hasPenalized) {
                setScore(prev => prev + 10);
            }
            playSound(true);
            
            // Đọc từ lên
            const utterance = new SpeechSynthesisUtterance(currentWordObj.word);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);

        } else {
            // --- TRƯỜNG HỢP SAI ---
            setStatus('wrong');
            playSound(false);

            // LOGIC MỚI: PHẠT ĐẨY XUỐNG CUỐI
            if (!hasPenalized) {
                setWrongCount(prev => prev + 1);
                setHasPenalized(true); // Đánh dấu đã phạt từ này rồi

                // Copy từ hiện tại và ném xuống cuối mảng words
                setWords(prevWords => {
                    const newWords = [...prevWords];
                    newWords.push(currentWordObj); // Phạt: Học lại từ này ở cuối
                    return newWords;
                });
            }
        }
    };

    const handleGiveUp = () => {
        // Bấm gợi ý cũng tính là sai -> Phạt xuống cuối
        if (!hasPenalized) {
            setWrongCount(prev => prev + 1);
            setHasPenalized(true);
            setWords(prevWords => [...prevWords, words[currentIndex]]);
        }

        setStatus('revealed'); 
        setUserInput(words[currentIndex].word); // Điền đáp án giúp người dùng
    };

    const handleNext = () => {
        if (currentIndex < words.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setUserInput('');
            setStatus('idle');
            setHasPenalized(false); // Reset trạng thái phạt cho từ mới
        } else {
            setIsFinished(true);
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
        }
    };

    const playSound = (isCorrect: boolean) => {
        const url = isCorrect 
            ? 'https://www.myinstants.com/media/sounds/correct.mp3'
            : 'https://www.myinstants.com/media/sounds/wrong-answer-sound-effect.mp3';
        new Audio(url).play().catch(() => {});
    };

    if (loading) return <div className="text-white text-center mt-20">Đang tải...</div>;

    if (isFinished) {
        return (
            <div className="min-h-screen bg-slate-900 p-6 flex flex-col items-center justify-center animate-fade-in text-white">
                <div className="text-6xl mb-4">✍️</div>
                <h2 className="text-4xl font-bold text-green-400 mb-2">HOÀN THÀNH!</h2>
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 text-center w-full max-w-sm mb-6">
                    <p className="text-slate-400 mb-2">Điểm số của bạn</p>
                    <p className="text-5xl font-black text-yellow-400">{score}</p>
                    <div className="mt-4 flex justify-center gap-4 text-sm">
                        <span className="text-red-400">Số lần bị phạt học lại: {wrongCount}</span>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={onBack} className="px-6 py-3 bg-slate-700 rounded-xl hover:bg-slate-600">Về Menu</button>
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-indigo-600 rounded-xl hover:bg-indigo-500 font-bold">Luyện lại</button>
                </div>
            </div>
        );
    }

    const currentWord = words[currentIndex];

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4">
            {/* Header */}
            <div className="w-full max-w-2xl flex justify-between items-center mb-10">
                <button onClick={onBack} className="text-slate-400 hover:text-white"><i className="fas fa-arrow-left"></i> Thoát</button>
                
                {/* Thanh tiến độ sẽ tự động dài ra nếu bạn làm sai */}
                <div className="text-white font-bold bg-slate-800 px-4 py-1 rounded-full text-sm border border-slate-700">
                    Câu {currentIndex + 1} / {words.length}
                </div>
                
                <div className="text-yellow-400 font-bold"><i className="fas fa-star mr-1"></i> {score}</div>
            </div>

            {/* Card Tiếng Việt */}
            <div className="w-full max-w-2xl bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl flex flex-col items-center text-center mb-8">
                <span className="text-xs font-bold text-indigo-400 bg-indigo-900/30 px-3 py-1 rounded-full mb-4">DỊCH SANG TIẾNG ANH</span>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-relaxed">
                    {currentWord.meaning}
                </h2>
                {currentWord.partOfSpeech && <p className="text-slate-500 italic">({currentWord.partOfSpeech})</p>}
                
                {/* Thông báo hình phạt */}
                {hasPenalized && (
                    <div className="mt-4 text-red-400 text-xs animate-pulse bg-red-900/20 px-3 py-1 rounded-full border border-red-900/50">
                        <i className="fas fa-exclamation-circle mr-1"></i> Sai rồi! Từ này đã bị đẩy xuống cuối hàng.
                    </div>
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleCheck} className="w-full max-w-2xl relative">
                <input 
                    type="text" 
                    value={userInput}
                    onChange={(e) => {
                        setUserInput(e.target.value);
                        if(status === 'wrong') setStatus('idle'); 
                    }}
                    placeholder="Gõ từ tiếng Anh vào đây..."
                    className={`w-full bg-slate-800 text-white text-2xl font-bold p-6 rounded-2xl border-2 outline-none text-center transition-all
                        ${status === 'correct' ? 'border-green-500 text-green-400' : ''}
                        ${status === 'wrong' ? 'border-red-500 text-red-400 animate-shake' : 'border-slate-600 focus:border-indigo-500'}
                    `}
                    autoFocus
                    spellCheck={false}
                    disabled={status === 'correct' || status === 'revealed'}
                />

                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-3xl">
                    {status === 'correct' && <i className="fas fa-check-circle text-green-500 animate-bounce"></i>}
                    {status === 'wrong' && <i className="fas fa-times-circle text-red-500"></i>}
                </div>
            </form>

            {/* Actions */}
            <div className="w-full max-w-2xl mt-6 flex gap-3">
                {status === 'idle' || status === 'wrong' ? (
                    <>
                        <button 
                            onClick={handleGiveUp}
                            type="button"
                            className="px-6 py-4 bg-slate-800 text-slate-400 font-bold rounded-xl hover:bg-slate-700 border border-slate-700 transition"
                        >
                            Gợi ý (+Phạt)
                        </button>
                        <button 
                            onClick={() => handleCheck()}
                            className="flex-1 px-6 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-900/30 transition"
                        >
                            Kiểm tra
                        </button>
                    </>
                ) : (
                    <button 
                        onClick={handleNext}
                        className="w-full px-6 py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-500 shadow-lg shadow-green-900/30 transition animate-pulse"
                    >
                        Tiếp tục <i className="fas fa-arrow-right ml-2"></i>
                    </button>
                )}
            </div>

            {(status === 'correct' || status === 'revealed') && (
                <div className="mt-6 text-slate-400 text-sm text-center">
                    <p className="mb-1">Đáp án đúng:</p>
                    <span className="text-white font-bold text-2xl tracking-wide">{currentWord.word}</span>
                    <p className="text-slate-500 mt-1 font-mono">{currentWord.pronunciation}</p>
                </div>
            )}
        </div>
    );
};

export default SpellingGame;