import React, { useState } from 'react';
import { Zap, Eye, EyeOff, Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import LightPillar from '../components/LightPillar';

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

    const inputClass = "w-full bg-white/[0.15] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all";

    return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-[#0a0a0b] px-4 relative overflow-hidden">
            {/* LightPillar Background Effect */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <LightPillar
                    topColor="#5227FF"
                    bottomColor="#FF9FFC"
                    intensity={0.8}
                    rotationSpeed={0.3}
                    glowAmount={0.015}
                    pillarWidth={6}
                    pillarHeight={0.5}
                    noiseIntensity={0.5}
                    pillarRotation={25}
                    interactive={false}
                    mixBlendMode="screen"
                    quality="high"
                />
            </div>

            <div className="relative w-full max-w-md z-10">
                <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl">

                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
                            <Zap className="w-7 h-7 text-white fill-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700 uppercase tracking-wider">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                    autoComplete="name"
                                    placeholder="Dinesh Kumar"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700 uppercase tracking-wider">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    autoComplete="email"
                                    placeholder="you@example.com"
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700 uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
                                    placeholder="Min 6 characters"
                                    className="w-full bg-white/[0.15] border border-white/[0.08] rounded-xl pl-10 pr-12 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
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
                                                style={{ background: strengthScore >= i ? strengthColor : '#d1d5db' }}
                                            />
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                        {[
                                            { label: '6+ chars', ok: strength.length },
                                            { label: 'Uppercase', ok: strength.upper },
                                            { label: 'Number', ok: strength.number },
                                        ].map(({ label, ok }) => (
                                            <span key={label} className={`flex items-center gap-1 transition-colors ${ok ? 'text-emerald-600' : 'text-gray-400'}`}>
                                                <CheckCircle2 className="w-3 h-3" /> {label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700 uppercase tracking-wider">Confirm Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                                <input
                                    type="password"
                                    name="confirm"
                                    value={form.confirm}
                                    onChange={handleChange}
                                    required
                                    autoComplete="new-password"
                                    placeholder="Re-enter password"
                                    className={`w-full bg-white/[0.15] border rounded-xl pl-10 pr-10 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-1 transition-all ${form.confirm && form.confirm !== form.password
                                        ? 'border-red-500/40 focus:border-red-500/60 focus:ring-red-500/20'
                                        : 'border-white/[0.08] focus:border-violet-500/60 focus:ring-violet-500/30'
                                        }`}
                                />
                                {form.confirm && form.confirm === form.password && (
                                    <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 pointer-events-none" />
                                )}
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20 hover:-translate-y-0.5"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Create Account <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full h-px bg-white/[0.06]" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-transparent px-3 text-xs text-gray-700">Already have an account?</span>
                        </div>
                    </div>

                    {/* Switch to Login */}
                    <button
                        onClick={goToLogin}
                        className="w-full py-3 rounded-xl border border-white/[0.08] text-sm font-medium text-gray-800 hover:bg-white/[0.04] hover:border-white/[0.15] transition-all"
                    >
                        Sign in instead
                    </button>
                </div>

                <p className="text-center text-xs text-gray-700 mt-6">
                    By creating an account you agree to our Terms of Service
                </p>
            </div>
        </div>
    );
}