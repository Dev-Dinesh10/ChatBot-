import React, { useEffect, useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, AreaChart, Area
} from 'recharts';
import { Activity, MessageCircle, Zap, TrendingUp, Calendar } from 'lucide-react';
import axios from 'axios';

const Dashboard = ({ token }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await axios.get('http://localhost:5000/api/analytics/stats', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStats(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchStats();
    }, [token]);

    if (loading) return <div className="p-8 text-gray-400">Loading analytics...</div>;
    if (!stats) return <div className="p-8 text-red-400">Error loading data</div>;

    const cards = [
        { title: 'Total Messages', value: stats.totalMessages, icon: <MessageCircle className="w-5 h-5" />, color: 'text-blue-400' },
        { title: 'Tokens (Today)', value: stats.tokensToday, icon: <Zap className="w-5 h-5" />, color: 'text-yellow-400' },
        { title: 'Tokens (Weekly)', value: stats.tokensThisWeek, icon: <TrendingUp className="w-5 h-5" />, color: 'text-green-400' },
        { title: 'Active Threads', value: stats.threadsCount, icon: <Activity className="w-5 h-5" />, color: 'text-purple-400' },
    ];

    return (
        <div className="p-6 md:p-10 space-y-8 bg-[#0a0a0b] min-h-screen text-white">
            <header>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                    Analytics Dashboard
                </h1>
                <p className="text-gray-500 mt-1">Monitor your usage and activity patterns</p>
            </header>

            {/* ── STAT CARDS ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {cards.map((c, i) => (
                    <div key={i} className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`p-2 rounded-lg bg-gray-900 ${c.color}`}>{c.icon}</div>
                            <span className="text-xs font-medium text-gray-600">All-time</span>
                        </div>
                        <div className="text-2xl font-bold">{c.value.toLocaleString()}</div>
                        <div className="text-sm text-gray-500 mt-1">{c.title}</div>
                    </div>
                ))}
            </div>

            {/* ── CHARTS ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Activity Heatmap (Simplified as Bar Chart for date activity) */}
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 h-[400px] flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <Calendar className="w-4 h-4 text-purple-400" />
                        <h2 className="text-lg font-semibold">Daily Activity</h2>
                    </div>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.heatmap}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="date" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#8b5cf6' }}
                                />
                                <Area type="monotone" dataKey="count" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Token Usage Comparison */}
                <div className="p-6 rounded-2xl bg-white/[0.03] border border-white/5 h-[400px] flex flex-col">
                    <div className="flex items-center gap-2 mb-6">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        <h2 className="text-lg font-semibold">Usage Overview</h2>
                    </div>
                    <div className="flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'Today', tokens: stats.tokensToday },
                                { name: 'This Week', tokens: stats.tokensThisWeek },
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#ffffff05' }}
                                    contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                />
                                <Bar dataKey="tokens" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
