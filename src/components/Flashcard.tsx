import React, { useState, useEffect } from 'react';
import type { Vocabulary, ApiResponse } from '../types/vocabulary';
import { askAI } from '../services/api';

interface IWindow extends Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any;
}

interface Props {
    data: Vocabulary;
    isFlipped: boolean;
    onFlip: () => void;
    onSpeak: () => void;
    isReverse?: boolean; // Nhận thêm props này
}

const Flashcard: React.FC<Props> = ({ data, isFlipped, onFlip, onSpeak, isReverse = false }) => {
    const [isListening, setIsListening] = useState(false);
    const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
    const [spokenWord, setSpokenWord] = useState('');
    const [showAI, setShowAI] = useState(false);
    const [aiContent, setAiContent] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        setFeedback('idle');
        setSpokenWord('');
        setIsListening(false);
        setShowAI(false);
        setAiContent('');
    }, [data]);

    const handleAskAI = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowAI(true);
        if (aiContent) return;

        setAiLoading(true);
        try {
            const res = await askAI(data.word);
            const payload = res.data as ApiResponse<String>;
            setAiContent(payload.data as string);
        } catch (error) {
            setAiContent("Lỗi kết nối tới trí tuệ nhân tạo!");
        } finally {
            setAiLoading(false);
        }
    };

    const handleCloseAI = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowAI(false);
    };

    const handleCheckPronunciation = (e: React.MouseEvent) => {
        e.stopPropagation();
        const customWindow = window as unknown as IWindow;
        const SpeechRecognitionApi = customWindow.SpeechRecognition || customWindow.webkitSpeechRecognition;

        if (!SpeechRecognitionApi) {
            alert("Trình duyệt không hỗ trợ. Hãy dùng Chrome/Edge.");
            return;
        }

        const recognition = new SpeechRecognitionApi();
        recognition.lang = 'en-US'; 
        recognition.continuous = false; 
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsListening(true);
            setFeedback('idle');
            setSpokenWord('...Đang nghe...');
        };

        recognition.onend = () => setIsListening(false);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            checkResult(transcript);
        };

        recognition.onerror = () => {
            setIsListening(false);
            setSpokenWord("Lỗi: Không nghe rõ");
        };

        recognition.start();
    };

    const checkResult = (transcript: string) => {
        const cleanSpoken = transcript.toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
        const cleanTarget = data.word.toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
        setSpokenWord(`Bạn nói: "${transcript}"`);

        if (cleanSpoken === cleanTarget || cleanSpoken.includes(cleanTarget)) {
            setFeedback('correct');
            const audio = new Audio('https://www.myinstants.com/media/sounds/correct.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } else {
            setFeedback('wrong');
            const audio = new Audio('https://www.myinstants.com/media/sounds/wrong-answer-sound-effect.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {});
        }
    };

    // --- RENDER CONTENT CHO TIẾNG ANH (CÓ TOOL) ---
    const renderEnglishContent = () => (
        <div className={`absolute w-full h-full rounded-2xl backface-hidden flex flex-col items-center justify-center border p-4 transition-colors duration-300
            ${feedback === 'correct' ? 'bg-green-50 border-green-500' : feedback === 'wrong' ? 'bg-red-50 border-red-500' : 'bg-slate-800 border-slate-700'}
            ${isReverse ? 'rotate-y-180' : ''}  
        `}>
            {/* Nếu đang ở chế độ đảo chiều (isReverse=true), thì mặt này sẽ là mặt SAU (rotate-180), ngược lại là mặt TRƯỚC */}
            
            <span className="absolute top-4 left-4 text-[10px] font-bold text-indigo-400 bg-indigo-900/30 px-2 py-1 rounded tracking-wider">WORD</span>
            
            <h2 className={`font-black mb-1 text-center break-words max-w-full px-2 ${feedback === 'idle' ? 'text-white' : 'text-slate-800'}
                ${data.word.length > 12 ? 'text-3xl' : 'text-4xl'}
            `}>
                {data.word}
            </h2>

            {data.partOfSpeech && (
                <span className={`text-sm font-bold italic mb-4 block ${feedback === 'idle' ? 'text-indigo-300' : 'text-slate-500'}`}>
                    ({data.partOfSpeech})
                </span>
            )}

            <p className="text-slate-400 font-mono text-lg mb-6">{data.pronunciation || '/.../'}</p>
            
            {/* CÔNG CỤ (MIC, LOA, AI) CHỈ HIỆN Ở MẶT TIẾNG ANH */}
            <div className="flex gap-3 items-center z-10 mb-2" onClick={(e) => e.stopPropagation()}>
                <button onClick={onSpeak} className="w-12 h-12 rounded-full bg-slate-700 hover:bg-indigo-600 flex items-center justify-center transition shadow-lg text-white text-lg border border-slate-600">
                    <i className="fas fa-volume-up"></i>
                </button>
                <button onClick={handleCheckPronunciation} className={`w-14 h-14 rounded-full flex items-center justify-center transition shadow-xl text-xl border-4 ${isListening ? 'bg-red-500 border-red-300 animate-pulse text-white' : 'bg-slate-700 border-slate-600 hover:bg-indigo-500 text-white'}`}>
                    {isListening ? <i className="fas fa-stop"></i> : <i className="fas fa-microphone"></i>}
                </button>
                <button onClick={handleAskAI} className="w-12 h-12 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 hover:scale-110 flex items-center justify-center transition shadow-lg text-white text-lg border border-purple-400 animate-bounce-slow">
                    <i className="fas fa-robot"></i>
                </button>
            </div>

            <div className="h-8 text-center w-full px-2">
                {!isListening && feedback === 'correct' && <div className="text-green-600 font-bold flex items-center justify-center gap-1 animate-bounce text-sm bg-green-100 px-3 py-1 rounded-full mx-auto w-fit shadow-sm"><i className="fas fa-check-circle"></i> Chính xác!</div>}
                {!isListening && feedback === 'wrong' && <div className="text-red-500 font-bold text-xs bg-red-100 px-3 py-1 rounded-lg"><i className="fas fa-times-circle mr-1"></i> Sai rồi!<br/><span className="font-normal text-slate-600 text-[10px]">Bạn nói: "{spokenWord.replace('Bạn nói: ', '').replace(/"/g, '')}"</span></div>}
            </div>

            {/* AI MODAL */}
            {showAI && (
                <div className="absolute inset-0 bg-slate-900/95 z-50 rounded-2xl p-6 flex flex-col animate-fade-in text-left overflow-y-auto cursor-default" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-4 border-b border-slate-700 pb-2">
                        <h3 className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 font-bold text-lg flex items-center gap-2"><i className="fas fa-robot"></i> AI Giải Thích</h3>
                        <button onClick={handleCloseAI} className="text-slate-400 hover:text-white p-1"><i className="fas fa-times"></i></button>
                    </div>
                    <div className="flex-1 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap font-sans">
                        {aiLoading ? <div className="flex flex-col items-center justify-center h-full text-purple-400"><i className="fas fa-circle-notch fa-spin text-3xl mb-3"></i><p className="animate-pulse">Đang suy nghĩ...</p></div> : aiContent}
                    </div>
                </div>
            )}
        </div>
    );

    // --- RENDER CONTENT CHO TIẾNG VIỆT (MEANING) ---
    const renderVietnameseContent = () => (
        <div className={`absolute w-full h-full bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl backface-hidden flex flex-col items-center justify-center text-white border border-indigo-400 p-6 shadow-inner
            ${!isReverse ? 'rotate-y-180' : ''} 
        `}>
            {/* Nếu đang đảo chiều (isReverse=true), mặt này là mặt TRƯỚC (không xoay), ngược lại là mặt SAU */}
            
            <span className="text-[10px] font-bold text-indigo-100 bg-white/20 px-2 py-1 rounded mb-4 tracking-wider">MEANING</span>
            <h3 className="text-2xl font-bold mb-4 text-center leading-relaxed">{data.meaning}</h3>
            {data.example && (
                <div className="bg-black/20 p-4 rounded-xl italic text-sm text-center border border-white/10 w-full">
                    "{data.example}"
                </div>
            )}
            <p className="absolute bottom-4 text-[10px] text-indigo-200 opacity-60 flex items-center gap-1">
                <i className="fas fa-hand-pointer"></i> Chạm để xem Tiếng Anh
            </p>
        </div>
    );

    return (
        <div className="w-full h-96 perspective-1000 cursor-pointer group select-none" onClick={onFlip}>
            <div className={`relative w-full h-full duration-500 transform-style-3d shadow-2xl rounded-2xl ${isFlipped ? 'rotate-y-180' : ''}`}>
                {/* LOGIC ĐẢO CHIỀU:
                    - Nếu isReverse = false (Mặc định): Mặt trước là Anh, Mặt sau là Việt.
                    - Nếu isReverse = true (Đảo): Mặt trước là Việt, Mặt sau là Anh.
                */}
                {isReverse ? (
                    <>
                        {renderVietnameseContent()} {/* Lúc này đóng vai trò mặt trước */}
                        {renderEnglishContent()}    {/* Lúc này đóng vai trò mặt sau */}
                    </>
                ) : (
                    <>
                        {renderEnglishContent()}    {/* Mặt trước */}
                        {renderVietnameseContent()} {/* Mặt sau */}
                    </>
                )}
            </div>
        </div>
    );
};

export default Flashcard;