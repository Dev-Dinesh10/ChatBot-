import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import DarkVeil from '../components/DarkVeil';

const BASE_URL = 'http://localhost:5000';

export default function Register({ goToLogin }) {
    const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    // Password strength checks
    const strength = {
        length: form.password.length >= 6,
        upper: /[A-Z]/.test(form.password),
        number: /[0-9]/.test(form.password),
    };
    const strengthScore = Object.values(strength).filter(Boolean).length;
    const strengthColor = ['', '#ef4444', '#f59e0b', '#10b981'][strengthScore];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.password !== form.confirm) {
            toast.warning('Passwords do not match.');
            return;
        }
        if (form.password.length < 6) {
            toast.warning('Password must be at least 6 characters.');
            return;
        }
        setLoading(true);
        try {
            await axios.post(`${BASE_URL}/api/auth/register`, {
                name: form.name,
                email: form.email,
                password: form.password,
            });
            toast.success('Account created! Please sign in.');
            goToLogin();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        background: 'rgba(255,255,255,0.07)',
        border: '1px solid rgba(255,255,255,0.10)',
        color: '#fff',
    };

    return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-[#050507] px-4 py-6 relative overflow-hidden">
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

            <div className="relative w-full max-w-sm" style={{ zIndex: 2 }}>
                <div
                    className="relative rounded-3xl p-6 shadow-2xl"
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        backdropFilter: 'blur(24px)',
                        WebkitBackdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255,255,255,0.10)',
                        boxShadow: '0 8px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)',
                    }}
                >
                    {/* Logo */}
                    <div className="flex flex-col items-center mb-6">
                        <img src="/logo.png" alt="Lucy AI Logo" className="w-24 h-24 object-contain mb-4 drop-shadow-lg" />
                        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Create account</h1>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                    autoComplete="name"
                                    placeholder="Your name"
                                    style={inputStyle}
                                    className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder-white/30 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
                                />
                            </div>
                        </div>

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
                                    style={inputStyle}
                                    className="w-full rounded-xl pl-10 pr-4 py-2.5 text-sm placeholder-white/30 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
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
                                    autoComplete="new-password"
                                    placeholder="Min 6 characters"
                                    style={inputStyle}
                                    className="w-full rounded-xl pl-10 pr-12 py-2.5 text-sm placeholder-white/30 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>

                            {/* Password strength bar */}
                            {form.password && (
                                <div className="space-y-1.5 pt-1">
                                    <div className="flex gap-1">
                                        {[1, 2, 3].map(i => (
                                            <div
                                                key={i}
                                                className="h-1 flex-1 rounded-full transition-all duration-300"
                                                style={{ background: strengthScore >= i ? strengthColor : 'rgba(255,255,255,0.10)' }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        {[
                                            { label: '6+ chars', ok: strength.length },
                                            { label: 'Uppercase', ok: strength.upper },
                                            { label: 'Number', ok: strength.number },
                                        ].map(({ label, ok }) => (
                                            <span key={label} className={`flex items-center gap-1 transition-colors ${ok ? 'text-emerald-400' : 'text-white/30'}`}>
                                                <CheckCircle2 className="w-3 h-3" /> {label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                                <input
                                    type="password"
                                    name="confirm"
                                    value={form.confirm}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
                                    placeholder="Re-enter password"
                                    style={{
                                        ...inputStyle,
                                        border: form.confirm && form.confirm !== form.password
                                            ? '1px solid rgba(239,68,68,0.5)'
                                            : '1px solid rgba(255,255,255,0.10)',
                                    }}
                                    className="w-full rounded-xl pl-10 pr-10 py-2.5 text-sm placeholder-white/30 outline-none focus:ring-1 focus:ring-violet-500/30 transition-all"
                                />
                                {form.confirm && form.confirm === form.password && (
                                    <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
                                )}
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
                                <>Create Account <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full h-px bg-white/[0.08]" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-transparent px-3 text-xs text-white/40">Already have an account?</span>
                        </div>
                    </div>

                    {/* Switch to Login */}
                    <button
                        onClick={goToLogin}
                        className="w-full py-3 rounded-xl text-sm font-medium text-white/70 hover:text-white transition-all"
                        style={{
                            border: '1px solid rgba(255,255,255,0.10)',
                            background: 'rgba(255,255,255,0.04)',
                        }}
                    >
                        Sign in instead
                    </button>
                </div>

                <p className="text-center text-xs text-white/25 mt-6">
                    By creating an account you agree to our Terms of Service
                </p>
            </div>
        </div>
    );
}