import React, { useState, useEffect } from 'react';
import { getWords } from '../services/api';
import type { Vocabulary, ApiResponse } from '../types/vocabulary';
import confetti from 'canvas-confetti';

interface Props {
    day: number;
    onBack: () => void;
}

interface CardItem {
    id: string;
    content: string;
    type: 'en' | 'vn';
    pairId: number;
    status: 'hidden' | 'selected' | 'matched' | 'wrong';
}

const ITEMS_PER_ROUND = 6; // Mỗi vòng chơi 6 cặp (12 thẻ)

const MatchingGame: React.FC<Props> = ({ day, onBack }) => {
    // Dữ liệu toàn bộ
    const [allWords, setAllWords] = useState<Vocabulary[]>([]);
    
    // Trạng thái vòng chơi
    const [currentRound, setCurrentRound] = useState(1);
    const [cards, setCards] = useState<CardItem[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    
    // Trạng thái game
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isGameFinished, setIsGameFinished] = useState(false);

    // Thống kê kết quả
    const [wrongMoves, setWrongMoves] = useState(0);
    const [startTime, setStartTime] = useState(Date.now());
    const [endTime, setEndTime] = useState(0);

    useEffect(() => {
        initGame();
    }, [day]);

    const initGame = async () => {
        setLoading(true);
        try {
            // 👇 ĐÃ SỬA: Thêm tham số 'true' thứ 2 để lấy cả từ đã thuộc (includeAll = true)
            // Cú pháp: getWords(day, random=true, includeAll=true)
            const res = await getWords(day, true, true);
            const data = (res.data as ApiResponse<Vocabulary[]>).data;
            
            if (!data || data.length === 0) {
                alert("Ngày này chưa có từ vựng nào để chơi!");
                onBack();
                return;
            }

            setAllWords(data);
            setupRound(1, data);
            setStartTime(Date.now());
        } catch (e) {
            console.error(e);
            alert("Lỗi tải dữ liệu game!");
            onBack();
        } finally {
            setLoading(false);
        }
    };

    const setupRound = (round: number, sourceWords: Vocabulary[]) => {
        const startIndex = (round - 1) * ITEMS_PER_ROUND;
        const endIndex = startIndex + ITEMS_PER_ROUND;
        const roundWords = sourceWords.slice(startIndex, endIndex);

        if (roundWords.length === 0) {
            finishGame();
            return;
        }

        let gameCards: CardItem[] = [];
        roundWords.forEach(w => {
            gameCards.push({ id: `en-${w.id}`, content: w.word, type: 'en', pairId: w.id, status: 'hidden' });
            gameCards.push({ id: `vn-${w.id}`, content: w.meaning, type: 'vn', pairId: w.id, status: 'hidden' });
        });

        gameCards.sort(() => Math.random() - 0.5);
        
        setCards(gameCards);
        setCurrentRound(round);
    };

    const finishGame = () => {
        setEndTime(Date.now());
        setIsGameFinished(true);
        confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
    };

    // --- LOGIC XỬ LÝ CLICK THẺ ---
    const handleCardClick = (id: string) => {
        if (isProcessing) return; // Đang check đúng sai thì không cho bấm
        
        const clickedCard = cards.find(c => c.id === id);
        if (!clickedCard || clickedCard.status === 'matched') return; // Thẻ đã xong thì bỏ qua

        // 1. HỦY CHỌN (DESELECT)
        if (clickedCard.status === 'selected') {
            const newCards = cards.map(c => c.id === id ? { ...c, status: 'hidden' } : c) as CardItem[];
            setCards(newCards);
            setSelectedIds(prev => prev.filter(itemId => itemId !== id));
            return; 
        }

        // 2. CHỌN THẺ MỚI
        const newCards = cards.map(c => c.id === id ? { ...c, status: 'selected' } : c) as CardItem[];
        setCards(newCards);

        const newSelected = [...selectedIds, id];
        setSelectedIds(newSelected);

        // Đủ 2 thẻ thì kiểm tra
        if (newSelected.length === 2) {
            setIsProcessing(true);
            checkMatch(newSelected, newCards);
        }
    };

    const checkMatch = (selected: string[], currentCards: CardItem[]) => {
        const card1 = currentCards.find(c => c.id === selected[0]);
        const card2 = currentCards.find(c => c.id === selected[1]);

        if (card1 && card2 && card1.pairId === card2.pairId) {
            // --- ĐÚNG ---
            setTimeout(() => {
                const updatedCards = currentCards.map(c => selected.includes(c.id) ? { ...c, status: 'matched' } : c) as CardItem[];
                setCards(updatedCards);
                setSelectedIds([]);
                setIsProcessing(false);
                
                const remaining = updatedCards.filter(c => c.status !== 'matched').length;
                if (remaining === 0) {
                    setTimeout(() => {
                        setupRound(currentRound + 1, allWords);
                    }, 800);
                }
            }, 300);
        } else {
            // --- SAI ---
            setWrongMoves(prev => prev + 1);
            setCards(prev => prev.map(c => selected.includes(c.id) ? { ...c, status: 'wrong' } : c));
            
            setTimeout(() => {
                // Lật úp lại thành hidden
                setCards(prev => prev.map(c => selected.includes(c.id) ? { ...c, status: 'hidden' } : c));
                setSelectedIds([]);
                setIsProcessing(false);
            }, 1000);
        }
    };

    // --- MÀN HÌNH TỔNG KẾT ---
    if (isGameFinished) {
        const totalTime = Math.round((endTime - startTime) / 1000);
        return (
            <div className="min-h-screen bg-slate-900 p-6 flex flex-col items-center justify-center animate-fade-in text-white">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-4xl font-bold text-yellow-400 mb-2">HOÀN THÀNH!</h2>
                <p className="text-slate-400 mb-8">Bạn đã ghép xong toàn bộ {allWords.length} từ.</p>

                <div className="grid grid-cols-2 gap-4 w-full max-w-lg mb-8">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                        <p className="text-sm text-slate-400">Số lần chọn sai</p>
                        <p className="text-3xl font-bold text-red-400">{wrongMoves}</p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 text-center">
                        <p className="text-sm text-slate-400">Thời gian</p>
                        <p className="text-3xl font-bold text-blue-400">{totalTime}s</p>
                    </div>
                </div>

                <div className="w-full max-w-3xl bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-8">
                    <div className="bg-slate-700 p-3 font-bold text-center border-b border-slate-600">
                        DANH SÁCH TỪ VỰNG ĐÃ ÔN
                    </div>
                    <div className="max-h-60 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                        {allWords.map((w, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                <span className="font-bold text-indigo-300">{w.word}</span>
                                <span className="text-sm text-slate-300">{w.meaning}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex gap-4">
                    <button onClick={onBack} className="px-6 py-3 border border-slate-500 rounded-full hover:bg-slate-800 transition">
                        Về Menu
                    </button>
                    <button onClick={initGame} className="px-6 py-3 bg-indigo-600 rounded-full font-bold hover:scale-105 transition shadow-lg">
                        Chơi lại
                    </button>
                </div>
            </div>
        );
    }

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Đang tải dữ liệu...</div>;

    const totalRounds = Math.ceil(allWords.length / ITEMS_PER_ROUND);

    return (
        <div className="min-h-screen bg-slate-900 p-4 flex flex-col items-center">
            {/* Header */}
            <div className="w-full max-w-4xl flex justify-between items-center mb-6">
                <button onClick={onBack} className="text-slate-400 hover:text-white px-3 py-1 rounded bg-slate-800"><i className="fas fa-arrow-left"></i></button>
                
                <div className="flex flex-col items-center">
                    <h1 className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-yellow-500">
                        Ghép Thẻ
                    </h1>
                    <div className="text-xs text-slate-400 font-mono mt-1 bg-slate-800 px-3 py-0.5 rounded-full border border-slate-700">
                        Vòng {currentRound} / {totalRounds}
                    </div>
                </div>

                <div className="text-red-400 font-bold text-sm bg-red-900/20 px-3 py-1 rounded border border-red-900/30">
                    Sai: {wrongMoves}
                </div>
            </div>

            {/* Lưới thẻ bài */}
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3 w-full max-w-4xl flex-1 content-center">
                {cards.map((card) => {
                    let baseStyle = "h-24 md:h-32 rounded-xl flex items-center justify-center p-2 text-center cursor-pointer transition-all duration-300 border-b-4 shadow-lg select-none active:scale-95";
                    
                    if (card.status === 'matched') return <div key={card.id} className="invisible"></div>;
                    
                    if (card.status === 'selected') {
                        baseStyle += " bg-indigo-600 border-indigo-800 text-white scale-105 ring-2 ring-indigo-400";
                    } else if (card.status === 'wrong') {
                        baseStyle += " bg-red-600 border-red-800 text-white animate-shake";
                    } else {
                        if (card.type === 'en') {
                            baseStyle += " bg-blue-900/40 border-blue-600/50 text-blue-100 hover:bg-blue-800/50";
                        } else {
                            baseStyle += " bg-orange-900/40 border-orange-600/50 text-orange-100 hover:bg-orange-800/50";
                        }
                    }

                    return (
                        <div key={card.id} onClick={() => handleCardClick(card.id)} className={baseStyle}>
                            <div className="flex flex-col items-center">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded mb-1 opacity-70 
                                    ${card.type === 'en' ? 'bg-blue-500 text-white' : 'bg-orange-500 text-black'}`}>
                                    {card.type === 'en' ? 'EN' : 'VN'}
                                </span>
                                <span className="font-bold text-sm md:text-lg line-clamp-3 leading-snug">
                                    {card.content}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MatchingGame;