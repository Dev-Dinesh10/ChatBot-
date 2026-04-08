import React, { useEffect, useState, useRef } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { Activity, MessageCircle, Zap, TrendingUp } from 'lucide-react';
import { Chart, ArcElement, Tooltip as ChartTooltip, Legend, DoughnutController } from 'chart.js';
import axios from 'axios';

Chart.register(ArcElement, ChartTooltip, Legend, DoughnutController);

/* ── Donut Chart via Chart.js ── */
const DonutChart = ({ today, week, month }) => {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        chartRef.current = new Chart(canvasRef.current, {
            type: 'doughnut',
            data: {
                labels: ['Today', 'This Week', 'This Month'],
                datasets: [{
                    data: [today, week, month],
                    backgroundColor: ['#6366f1', '#8b5cf6', '#a78bfa'],
                    borderWidth: 0,
                    hoverOffset: 6,
                }],
            },
            options: {
                responsive: false,
                cutout: '72%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: ${ctx.parsed.toLocaleString()}`,
                        },
                        backgroundColor: '#111',
                        borderColor: '#333',
                        borderWidth: 1,
                        titleColor: '#888',
                        bodyColor: '#fff',
                        padding: 10,
                        cornerRadius: 8,
                    },
                },
            },
        });

        return () => chartRef.current?.destroy();
    }, [today, week, month]);

    const total = ((today + week + month) / 1000).toFixed(0) + 'K';

    return (
        <div className="relative" style={{ width: 160, height: 160 }}>
            <canvas ref={canvasRef} width={160} height={160} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-bold text-white">{total}</span>
                <span className="text-[10px] text-gray-600 mt-0.5">total tokens</span>
            </div>
        </div>
    );
};

/* ── Legend Row ── */
const LegendRow = ({ color, label, value, pct }) => (
    <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-gray-400">
            <span className="w-2.5 h-2.5 rounded-[2px]" style={{ background: color }} />
            {label}
        </div>
        <div className="flex-1 mx-3 h-1 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="text-gray-300 font-medium w-16 text-right">{value.toLocaleString()}</span>
    </div>
);

/* ── Custom Tooltip for Area Chart ── */
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-[#111] border border-white/10 rounded-xl px-3 py-2 text-xs text-white">
            <p className="text-gray-400 mb-1">{label}</p>
            <p className="font-semibold">{payload[0].value.toLocaleString()} messages</p>
        </div>
    );
};

/* ── Main Dashboard ── */
const Dashboard = ({ token }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        axios
            .get('http://localhost:5000/api/analytics/stats', {
                headers: { Authorization: `Bearer ${token}` },
            })
            .then((res) => setStats(res.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [token]);

    if (loading) return (
        <div className="p-10 text-gray-500 bg-[#0a0a0b] min-h-screen flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            Loading analytics...
        </div>
    );
    if (!stats) return (
        <div className="p-10 text-red-400 bg-[#0a0a0b] min-h-screen">
            Failed to load data.
        </div>
    );

    const cards = [
        {
            title: 'Total Messages',
            value: stats.totalMessages,
            icon: <MessageCircle className="w-4 h-4" />,
            color: 'text-blue-400',
            period: 'All-time',
        },
        {
            title: 'Tokens Today',
            value: stats.tokensToday,
            icon: <Zap className="w-4 h-4" />,
            color: 'text-yellow-400',
            period: 'Today',
        },
        {
            title: 'Tokens This Week',
            value: stats.tokensThisWeek,
            icon: <TrendingUp className="w-4 h-4" />,
            color: 'text-green-400',
            period: 'Weekly',
        },
        {
            title: 'Active Threads',
            value: stats.threadsCount,
            icon: <Activity className="w-4 h-4" />,
            color: 'text-purple-400',
            period: 'Live',
            pulse: true,
        },
    ];

    const totalTokens = stats.tokensToday + stats.tokensThisWeek + (stats.tokensThisMonth ?? 0);
    const weeklyRate = totalTokens > 0
        ? ((stats.tokensThisWeek / totalTokens) * 100).toFixed(1)
        : 0;

    return (
        <div className="p-6 md:p-10 space-y-8 bg-[#0a0a0b] min-h-screen text-white">

            {/* Header */}
            <header>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                    Analytics Dashboard
                </h1>
                <p className="text-gray-500 mt-1 text-sm">Monitor your usage and activity patterns</p>
            </header>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((c, i) => (
                    <div
                        key={i}
                        className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/10 transition-all"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-lg bg-gray-900 ${c.color}`}>{c.icon}</div>
                            <span className="text-[10px] font-semibold tracking-widest text-gray-600 uppercase">
                                {c.period}
                            </span>
                        </div>
                        <div className="text-2xl font-bold flex items-center gap-2">
                            {c.value.toLocaleString()}
                            {c.pulse && (
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                            )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{c.title}</div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Area Chart — Daily Activity */}
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] h-[360px] flex flex-col">
                    <div className="flex items-center gap-2 mb-5">
                        <span className="w-2 h-2 rounded-full bg-purple-500" />
                        <h2 className="text-sm font-medium text-gray-300">Daily Activity</h2>
                    </div>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.heatmap} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                                <XAxis dataKey="date" stroke="#444" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis stroke="#444" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    fill="url(#areaGrad)"
                                    fillOpacity={1}
                                    isAnimationActive={true}
                                    dot={{ fill: '#8b5cf6', strokeWidth: 0, r: 3 }}
                                    activeDot={{ r: 5, fill: '#a78bfa' }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Donut Chart — Token Usage */}
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] h-[360px] flex flex-col">
                    <div className="flex items-center gap-2 mb-5">
                        <span className="w-2 h-2 rounded-full bg-yellow-400" />
                        <h2 className="text-sm font-medium text-gray-300">Token Usage Breakdown</h2>
                    </div>

                    <div className="flex items-center gap-6 flex-1">
                        {/* Donut */}
                        <DonutChart
                            today={stats.tokensToday}
                            week={stats.tokensThisWeek}
                            month={stats.tokensThisMonth ?? 59267}
                        />

                        {/* Legend + trend */}
                        <div className="flex-1 flex flex-col gap-3">
                            <LegendRow
                                color="#6366f1"
                                label="Today"
                                value={stats.tokensToday}
                                pct={Math.round((stats.tokensToday / totalTokens) * 100)}
                            />
                            <LegendRow
                                color="#8b5cf6"
                                label="This Week"
                                value={stats.tokensThisWeek}
                                pct={Math.round((stats.tokensThisWeek / totalTokens) * 100)}
                            />
                            <LegendRow
                                color="#a78bfa"
                                label="This Month"
                                value={stats.tokensThisMonth ?? 59267}
                                pct={Math.round(((stats.tokensThisMonth ?? 59267) / totalTokens) * 100)}
                            />

                            {/* Trend pill */}
                            <div className="mt-2 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                <p className="text-[10px] font-semibold tracking-widest text-indigo-400 uppercase">
                                    Weekly Usage Rate
                                </p>
                                <p className="text-lg font-bold text-white mt-1">
                                    {weeklyRate}%{' '}
                                    <span className="text-green-400 text-xs font-normal">↑ of total</span>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;