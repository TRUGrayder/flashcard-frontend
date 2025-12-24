import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { getDaysProgress } from '../services/api';
import type { ApiResponse } from '../types/vocabulary';

// Đăng ký các thành phần của Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface DayProgress {
    day: number;
    totalWords: number;
    masteredWords: number;
}

const Stats: React.FC<{ onBack: () => void }> = ({ onBack }) => {
    const [data, setData] = useState<DayProgress[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await getDaysProgress();
                const payload = res.data as ApiResponse<DayProgress[]>;
                setData(payload.data);
            } catch (error) { console.error(error); }
        };
        fetchData();
    }, []);

    // Cấu hình dữ liệu cho biểu đồ
    const chartData = {
        labels: data.map(d => `Day ${d.day}`),
        datasets: [
            {
                label: 'Từ đã thuộc',
                data: data.map(d => d.masteredWords),
                backgroundColor: 'rgba(34, 197, 94, 0.8)', // Màu xanh lá
                borderRadius: 4,
            },
            {
                label: 'Chưa thuộc',
                data: data.map(d => d.totalWords - d.masteredWords),
                backgroundColor: 'rgba(71, 85, 105, 0.5)', // Màu xám
                borderRadius: 4,
            },
        ],
    };

    const options = {
        responsive: true,
        scales: {
            x: { stacked: true, grid: { display: false } },
            y: { stacked: true, grid: { color: '#334155' } }, // Màu lưới tối
        },
        plugins: {
            legend: { position: 'top' as const, labels: { color: 'white' } },
        },
    };

    // Tính tổng quan
    const totalMastered = data.reduce((acc, curr) => acc + curr.masteredWords, 0);
    const totalWords = data.reduce((acc, curr) => acc + curr.totalWords, 0);

    return (
        <div className="min-h-screen bg-slate-900 p-6 text-white flex flex-col items-center">
            <div className="w-full max-w-4xl flex justify-between items-center mb-8">
                <button onClick={onBack} className="text-slate-400 hover:text-white"><i className="fas fa-arrow-left"></i> Quay lại</button>
                <h1 className="text-2xl font-bold">Thống Kê Học Tập</h1>
                <div className="w-20"></div>
            </div>

            {/* Thẻ tổng quan */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-4xl mb-8">
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 text-center">
                    <p className="text-slate-400 text-sm mb-1">Tổng từ đã thuộc</p>
                    <p className="text-4xl font-black text-green-400">{totalMastered}</p>
                </div>
                <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 text-center">
                    <p className="text-slate-400 text-sm mb-1">Tiến độ toàn bộ</p>
                    <p className="text-4xl font-black text-indigo-400">
                        {totalWords > 0 ? Math.round((totalMastered / totalWords) * 100) : 0}%
                    </p>
                </div>
            </div>

            {/* Biểu đồ */}
            <div className="w-full max-w-4xl bg-slate-800 p-4 rounded-2xl border border-slate-700">
                <Bar options={options} data={chartData} />
            </div>
        </div>
    );
};

export default Stats;