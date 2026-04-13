import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import DarkVeil from '../components/DarkVeil';

const BASE_URL = 'http://localhost:5000';

export default function Login({ onLogin, goToRegister, goToLanding }) {
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(`${BASE_URL}/api/auth/login`, form);
            localStorage.setItem('genai_token', res.data.token);
            localStorage.setItem('genai_user', JSON.stringify(res.data.user));
            toast.success('Logged in successfully!');
            onLogin(res.data.token, res.data.user);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-screen flex items-center justify-center px-4 py-6 relative overflow-hidden bg-[#050507]">
            {/* DarkVeil WebGL Background */}
            <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
                <DarkVeil
                    hueShift={20}
                    noiseIntensity={0.04}
                    scanlineIntensity={0}
                    speed={0.4}
                    scanlineFrequency={0}
                    warpAmount={0.3}
                    resolutionScale={1}
                />
            </div>

            {/* Subtle vignette overlay */}
            <div
                className="fixed inset-0 pointer-events-none"
                style={{
                    zIndex: 1,
                    background: 'radial-gradient(ellipse at center, transparent 30%, rgba(5,5,7,0.7) 100%)',
                }}
            />

            <div className="relative w-full max-w-md" style={{ zIndex: 2 }}>
                {/* Card */}
                <div
                    className="relative rounded-3xl p-6 sm:p-8 shadow-2xl"
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        boxShadow: '0 8px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
                    }}
                >
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <button onClick={goToLanding} className="hover:scale-110 transition-transform active:scale-95 mb-4 group">
                            <img src="/logo.png" alt="Lucy AI Logo" className="w-32 h-32 object-contain drop-shadow-lg group-hover:drop-shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all" />
                        </button>
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Welcome back</h1>
                        <p className="text-white/50 text-sm mt-1">Sign in to your Lucy AI account</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    style={{
                                        background: 'rgba(255,255,255,0.07)',
                                        border: '1px solid rgba(255,255,255,0.10)',
                                        color: '#fff',
                                    }}
                                    className="w-full rounded-xl pl-10 pr-4 py-3 text-sm placeholder-white/30 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    style={{
                                        background: 'rgba(255,255,255,0.07)',
                                        border: '1px solid rgba(255,255,255,0.10)',
                                        color: '#fff',
                                    }}
                                    className="w-full rounded-xl pl-10 pr-12 py-3 text-sm placeholder-white/30 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:-translate-y-0.5"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Sign In <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6 text-center">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full h-px bg-white/[0.08]" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-transparent px-3 text-xs text-white/40">Don't have an account?</span>
                        </div>
                    </div>

                    {/* Switch to Register */}
                    <button
                        onClick={goToRegister}
                        className="w-full py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all"
                        style={{
                            border: '1px solid rgba(255,255,255,0.10)',
                            background: 'rgba(255,255,255,0.04)',
                        }}
                    >
                        Create an account
                    </button>
                </div>

                <p className="text-center text-xs text-white/25 mt-6">
                    Secured with JWT · Powered by Lucy AI
                </p>
            </div>
        </div>
    );
}