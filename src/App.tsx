import { useState, useEffect } from 'react';
import { getWords, markMastered, getDaysProgress, resetDay } from './services/api';
import type { Vocabulary, ApiResponse } from './types/vocabulary';
import Flashcard from './components/Flashcard';
import Quiz from './components/Quiz';
import MatchingGame from './components/MatchingGame';
import SpellingGame from './components/SpellingGame';
import Stats from './components/Stats';

interface DayProgress {
  day: number;
  totalWords: number;
  masteredWords: number;
  isUnlocked: boolean;
}

function App() {
  const [view, setView] = useState<'menu' | 'learning' | 'quiz' | 'game' | 'stats' | 'spelling'>('menu');
  const [daysData, setDaysData] = useState<DayProgress[]>([]);
  const [words, setWords] = useState<Vocabulary[]>([]);
  const [currentDay, setCurrentDay] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // State đảo chiều (Mặc định false: Anh -> Việt)
  const [isReverse, setIsReverse] = useState(false);

  useEffect(() => {
    if (view === 'menu') fetchDaysProgress();
  }, [view]);

  const fetchDaysProgress = async () => {
    try {
      const res = await getDaysProgress();
      const payload = res.data as ApiResponse<DayProgress[]>;
      setDaysData(payload.data);
    } catch (e) { console.error(e); }
  };

  const handleSelectDay = (dayData: DayProgress) => {
    if (!dayData.isUnlocked) {
      if (navigator.vibrate) navigator.vibrate(50);
      alert("🔒 Hoàn thành ngày trước để mở khóa!");
      return;
    }
    setCurrentDay(dayData.day);
    setView('learning');
    setIsReverse(false);
    fetchWords(dayData.day, false); 
  };

  const fetchWords = async (day: number, includeAll: boolean = false) => {
    setLoading(true);
    try {
      const res = await getWords(day, true, includeAll); 
      const data = (res.data as ApiResponse<Vocabulary[]>).data;
      setWords(data);
      setCurrentIndex(0);
      setIsFlipped(false);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const toggleReverse = () => {
      setIsReverse(!isReverse);
      setIsFlipped(false);
  };

  // --- LOGIC ĐIỀU HƯỚNG ---
  const handleNext = () => {
    if (words.length <= 1) return; 
    let newIndex;
    do {
        newIndex = Math.floor(Math.random() * words.length);
    } while (newIndex === currentIndex && words.length > 1);
    setCurrentIndex(newIndex);
    setIsFlipped(false);
  };

  const handlePrev = () => {
    if (words.length === 0) return;
    const newIndex = currentIndex === 0 ? words.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    setIsFlipped(false);
  };

  const handleSpeak = () => {
    if (!words[currentIndex]) return;
    const utterance = new SpeechSynthesisUtterance(words[currentIndex].word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  const handleMastered = async () => {
    if (!words[currentIndex]) return;
    try {
      await markMastered(words[currentIndex].id);
      const newWords = words.filter((_, i) => i !== currentIndex);
      setWords(newWords);
      setIsFlipped(false);
      if (newWords.length > 0) {
          const nextIndex = Math.floor(Math.random() * newWords.length);
          setCurrentIndex(nextIndex);
      }
    } catch (e) { alert("Lỗi kết nối"); }
  };

  const handleResetDay = async () => {
    if (confirm("Học lại từ đầu ngày này (Xóa hết tiến độ)?")) {
      await resetDay(currentDay);
      fetchWords(currentDay, false);
    }
  };

  // --- RENDER VIEWS ---
  if (view === 'quiz') return <Quiz day={currentDay} onBack={() => setView('learning')} onPass={() => { setView('menu'); fetchDaysProgress(); }} />;
  if (view === 'game') return <MatchingGame day={currentDay} onBack={() => setView('learning')} />;
  if (view === 'spelling') return <SpellingGame day={currentDay} onBack={() => setView('learning')} />;
  if (view === 'stats') return <Stats onBack={() => setView('menu')} />;

  if (view === 'menu') {
    return (
      <div className="min-h-screen bg-slate-900 pb-10">
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 p-4 mb-4 flex justify-between items-center">
            <h1 className="text-xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Lộ Trình 30 Ngày</h1>
            <button onClick={() => setView('stats')} className="bg-slate-800 p-2 rounded-lg text-indigo-400 border border-indigo-500/30 hover:bg-indigo-900 transition"><i className="fas fa-chart-bar text-xl"></i></button>
        </div>
        <div className="px-4 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-w-5xl mx-auto">
            {daysData.map((d) => (
                <div key={d.day} onClick={() => handleSelectDay(d)} className={`relative p-3 rounded-xl border transition cursor-pointer flex flex-col items-center justify-center h-28 active:scale-95 ${d.isUnlocked ? 'bg-slate-800 border-indigo-500 shadow-lg shadow-indigo-500/10' : 'bg-slate-900 border-slate-800 opacity-50'}`}>
                <span className="text-xl font-black mb-1 text-white">Day {d.day}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${d.masteredWords === d.totalWords ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>{d.masteredWords}/{d.totalWords}</span>
                {!d.isUnlocked && <div className="absolute inset-0 bg-slate-950/60 flex items-center justify-center rounded-xl backdrop-blur-[1px]"><i className="fas fa-lock text-xl text-slate-500"></i></div>}
                {d.isUnlocked && d.masteredWords === d.totalWords && d.totalWords > 0 && <div className="absolute top-2 right-2 text-green-500"><i className="fas fa-check-circle"></i></div>}
                </div>
            ))}
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center p-4">
      <div className="w-full max-w-md mb-4 pt-2 flex flex-col gap-3">
        <div className="flex justify-between items-center">
            <button onClick={() => setView('menu')} className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 active:bg-slate-700"><i className="fas fa-arrow-left"></i> Menu</button>
            <div className="text-white font-bold bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">Còn lại: <span className="text-yellow-400">{words.length}</span></div>
            <button onClick={handleResetDay} className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-800 border border-slate-700 text-slate-400 hover:text-red-400 active:bg-slate-700"><i className="fas fa-redo"></i></button>
        </div>
        <button onClick={toggleReverse} className={`w-full py-3 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition shadow-md ${isReverse ? 'bg-gradient-to-r from-orange-600 to-yellow-600 border-orange-500 text-white' : 'bg-slate-800 border-slate-600 text-slate-400'}`}><i className="fas fa-exchange-alt"></i> {isReverse ? 'CHẾ ĐỘ KHÓ: HIỆN TIẾNG VIỆT TRƯỚC' : 'CHẾ ĐỘ DỄ: HIỆN TIẾNG ANH TRƯỚC'}</button>
      </div>

      <div className="w-full max-w-md flex-1 flex flex-col justify-center pb-6">
        {loading ? (
           <div className="h-64 flex flex-col items-center justify-center text-indigo-400 animate-pulse bg-slate-800/50 rounded-2xl border border-slate-700/50"><i className="fas fa-circle-notch fa-spin text-3xl mb-3"></i><span className="text-sm">Đang tải...</span></div>
        ) : words.length > 0 ? (
          <>
            <div className="w-full bg-slate-800 rounded-full h-1 mb-4 overflow-hidden"><div className="bg-gradient-to-r from-indigo-500 to-cyan-500 h-full transition-all duration-300" style={{ width: `100%` }}></div></div>
            <Flashcard data={words[currentIndex]} isFlipped={isFlipped} onFlip={() => setIsFlipped(!isFlipped)} onSpeak={handleSpeak} isReverse={isReverse} />
            
            <div className="flex gap-4 mt-8">
                <button onClick={handlePrev} className="p-4 w-16 bg-slate-800 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-700 transition border border-slate-700 shadow-lg active:scale-95"><i className="fas fa-arrow-left text-xl"></i></button>
                <button onClick={handleMastered} className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold rounded-2xl py-4 shadow-lg shadow-emerald-900/30 border-b-4 border-emerald-800 active:scale-95 transition flex flex-col items-center justify-center"><span className="text-lg"><i className="fas fa-check-circle mr-2"></i>Đã thuộc</span><span className="text-[10px] font-normal opacity-80">(Xóa thẻ này)</span></button>
                <button onClick={handleNext} className="p-4 w-16 bg-slate-800 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-700 transition border border-slate-700 shadow-lg active:scale-95"><i className="fas fa-arrow-right text-xl"></i></button>
            </div>
            <p className="text-center text-slate-500 text-xs mt-6 font-mono opacity-60">Bấm mũi tên phải để bỏ qua (sẽ lặp lại sau)</p>

            {/* 👇 ĐÃ BỔ SUNG: Nút Luyện Viết vào đây 👇 */}
            <div className="mt-8 pt-6 border-t border-slate-800 grid grid-cols-3 gap-2">
                <button onClick={() => setView('quiz')} className="py-3 bg-slate-800 border border-slate-700 rounded-xl text-yellow-500 font-bold hover:bg-slate-700 transition flex flex-col items-center justify-center gap-1">
                    <i className="fas fa-trophy text-xl"></i>
                    <span className="text-[10px] uppercase">Trắc nghiệm</span>
                </button>
                <button onClick={() => setView('game')} className="py-3 bg-slate-800 border border-slate-700 rounded-xl text-pink-500 font-bold hover:bg-slate-700 transition flex flex-col items-center justify-center gap-1">
                    <i className="fas fa-puzzle-piece text-xl"></i>
                    <span className="text-[10px] uppercase">Ghép Thẻ</span>
                </button>
                <button onClick={() => setView('spelling')} className="py-3 bg-slate-800 border border-slate-700 rounded-xl text-cyan-400 font-bold hover:bg-slate-700 transition flex flex-col items-center justify-center gap-1">
                    <i className="fas fa-pen-nib text-xl"></i>
                    <span className="text-[10px] uppercase">Luyện Viết</span>
                </button>
            </div>
          </>
        ) : (
          <div className="h-80 bg-slate-800/80 backdrop-blur rounded-2xl border border-slate-700 flex flex-col items-center justify-center text-center p-8 shadow-xl">
             <div className="text-5xl mb-4 animate-bounce">🎉</div>
             <h3 className="text-white font-bold text-xl mb-2">Đã học hết!</h3>
             <p className="text-slate-400 text-sm mb-8">Bạn đã thuộc làu làu danh sách hôm nay.</p>
             <div className="flex flex-col gap-3 w-full">
                 <button onClick={() => setView('game')} className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold rounded-xl shadow-lg hover:brightness-110 transition"><i className="fas fa-gamepad mr-2"></i> Chơi Game Ghép Thẻ</button>
                 <button onClick={() => setView('quiz')} className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold rounded-xl shadow-lg hover:brightness-110 transition"><i className="fas fa-trophy mr-2"></i> Làm trắc nghiệm</button>
                 
                 {/* 👇 ĐÃ BỔ SUNG: Nút Luyện Viết vào đây 👇 */}
                 <button onClick={() => setView('spelling')} className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl shadow-lg hover:bg-cyan-500 transition"><i className="fas fa-pen-nib mr-2"></i> Luyện Viết (Chính tả)</button>
                 
                 <button onClick={() => { fetchWords(currentDay, true); setView('learning'); }} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition"><i className="fas fa-sync-alt mr-2"></i> Ôn tập lại (Review)</button>
                 <button onClick={() => setView('menu')} className="w-full py-3 bg-slate-700 text-white font-bold rounded-xl hover:bg-slate-600 transition"><i className="fas fa-list mr-2"></i> Quay về Menu</button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;