import React, { useState } from 'react';
import { Zap, Eye, EyeOff, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import LightPillar from '../components/LightPillar';

const BASE_URL = 'http://localhost:5000';

export default function Login({ onLogin, goToRegister }) {
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
            localStorage.setItem('klausai_token', res.data.token);
            localStorage.setItem('klausai_user', JSON.stringify(res.data.user));
            toast.success('Logged in successfully!');
            onLogin(res.data.token, res.data.user);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-screen flex items-center justify-center bg-[#0a0a0b] px-4 py-6 relative overflow-hidden">
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
                {/* Card */}
                <div className="relative bg-white/40 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 sm:p-8 shadow-2xl">

                    {/* Logo */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20">
                            <Zap className="w-7 h-7 text-white fill-white" />
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Welcome back</h1>
                        <p className="text-gray-700 text-sm mt-1">Sign in to your KlausAI account</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700 uppercase tracking-wider">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="you@example.com"
                                    className="w-full bg-white/50 border border-black/5 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-violet-600/60 focus:ring-1 focus:ring-violet-600/30 transition-all"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-gray-700 uppercase tracking-wider">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="••••••••"
                                    className="w-full bg-white/50 border border-black/5 rounded-xl pl-10 pr-12 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-violet-600/60 focus:ring-1 focus:ring-violet-600/30 transition-all"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-black transition-colors">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:-translate-y-0.5"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>Sign In <ArrowRight className="w-4 h-4" /></>
                            )}
                        </button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full h-px bg-white/[0.06]" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="bg-transparent px-3 text-xs text-gray-600">Don't have an account?</span>
                        </div>
                    </div>

                    {/* Switch to Register */}
                    <button
                        onClick={goToRegister}
                        className="w-full py-3 rounded-xl border border-black/10 text-sm font-medium text-gray-700 hover:bg-black/5 hover:border-black/20 transition-all"
                    >
                        Create an account
                    </button>
                </div>

                <p className="text-center text-xs text-gray-500 mt-6">
                    Secured with JWT · Powered by KlausAI
                </p>
            </div>
        </div>
    );
}