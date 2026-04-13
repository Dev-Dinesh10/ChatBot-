import React from 'react';
import { motion } from 'framer-motion';
import { 
    MessageSquare, BookOpen, LayoutDashboard, 
    ArrowRight, Zap, Shield, Globe, 
    Sparkles, MessageCircle, FileText, ChevronRight
} from 'lucide-react';
import DarkVeil from '../components/DarkVeil';

export default function Landing({ onGetStarted, onLogin }) {
    const features = [
        {
            icon: <MessageCircle className="w-6 h-6 text-violet-400" />,
            title: "Advanced AI Chat",
            desc: "Experience high-speed, persistent conversations with contextual memory and streaming responses.",
            color: "from-violet-500/20 to-transparent"
        },
        {
            icon: <FileText className="w-6 h-6 text-indigo-400" />,
            title: "Document RAG",
            desc: "Upload PDFs, TXT, or MD files and chat with your documents using advanced vector retrieval.",
            color: "from-indigo-500/20 to-transparent"
        },
        {
            icon: <Globe className="w-6 h-6 text-sky-400" />,
            title: "URL Indexing",
            desc: "Instantly index web articles and documentation to extract knowledge and start chatting.",
            color: "from-sky-500/20 to-transparent"
        },
        {
            icon: <LayoutDashboard className="w-6 h-6 text-emerald-400" />,
            title: "Live Analytics",
            desc: "Track your usage, message volume, and token consumption with beautiful realtime charts.",
            color: "from-emerald-500/20 to-transparent"
        },
        {
            icon: <Shield className="w-6 h-6 text-rose-400" />,
            title: "Secure Auth",
            desc: "Enterprise-grade JWT authentication ensures your data and conversations stay private.",
            color: "from-rose-500/20 to-transparent"
        },
        {
            icon: <Zap className="w-6 h-6 text-amber-400" />,
            title: "Fast Retrieval",
            desc: "Powered by BM25 and high-performance embeddings for lightning-fast answer generation.",
            color: "from-amber-500/20 to-transparent"
        }
    ];

    return (
        <div className="min-h-screen bg-[#050507] text-white selection:bg-violet-500/30 overflow-x-hidden font-sans">
            
            {/* ── BACKGROUND ── */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <DarkVeil 
                    hueShift={15} 
                    noiseIntensity={0.03} 
                    speed={0.3} 
                    warpAmount={0.2}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050507]/40 to-[#050507]" />
            </div>

            {/* ── NAVBAR ── */}
            <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 border-b border-white/5 bg-[#050507]/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 flex items-center justify-center">
                            <img src="/logo.png" alt="Lucy AI" className="w-full h-full object-contain" />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={onLogin}
                            className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                        >
                            Sign In
                        </button>
                        <button 
                            onClick={onGetStarted}
                            className="px-5 py-2.5 rounded-xl bg-white text-[#050507] text-sm font-bold hover:bg-gray-200 transition-all shadow-lg hover:shadow-white/10 active:scale-95"
                        >
                            Get Started
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── HERO SECTION ── */}
            <header className="relative pt-32 pb-20 px-6 z-10">
                <div className="max-w-5xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm">
                            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                            <span className="text-[10px] sm:text-xs font-bold text-violet-300 uppercase tracking-widest">Next-Gen Intelligence</span>
                        </div>
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
                            Welcome to <br />
                            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">
                                Lucy AI.
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                            The all-in-one platform for intelligent chat, document RAG, and live analytics. 
                            Build your knowledge base and interact with it in seconds.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button 
                                onClick={onGetStarted}
                                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold text-base hover:from-violet-500 hover:to-indigo-500 transition-all shadow-xl shadow-violet-600/20 hover:shadow-violet-600/40 hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
                            >
                                Get Started Free <ArrowRight className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={onLogin}
                                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/80 font-bold text-base hover:bg-white/10 hover:text-white transition-all backdrop-blur-md"
                            >
                                View Demo
                            </button>
                        </div>
                    </motion.div>
                </div>

                {/* UI Preview Mockup */}
                <motion.div 
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="max-w-6xl mx-auto mt-20 relative px-4"
                >
                    <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-[0_30px_80px_-15px_rgba(0,0,0,0.7)] bg-[#0a0a0c] group">
                        {/* macOS Header - Refined for "Perfect Fit" */}
                        <div className="h-10 bg-[#161618] border-b border-white/[0.05] flex items-center px-4 gap-4 z-20">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                            </div>
                            <div className="flex-1 flex justify-center">
                                <div className="h-6 w-full max-w-[400px] rounded-md bg-black/30 text-[10px] text-white/40 flex items-center justify-center gap-2 font-mono border border-white/5">
                                    <Globe className="w-2.5 h-2.5 opacity-30" />
                                    lucy-ai.app/dashboard
                                </div>
                            </div>
                            <div className="w-16" /> {/* Spacer to balance traffic lights */}
                        </div>
                        
                        {/* Main Content - Auto scale to fit image perfectly */}
                        <div className="relative w-full">
                            <img 
                                src="/Chatbot.png" 
                                alt="Lucy AI Dashboard Preview" 
                                className="w-full h-auto block"
                            />
                            {/* Subtle inner glow to match macOS window feel */}
                            <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-b-xl" />
                        </div>
                    </div>
                    {/* Glowing Accent */}
                    <div className="absolute -top-10 -left-10 w-40 h-40 bg-violet-600/20 rounded-full blur-[100px]" />
                    <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-indigo-600/20 rounded-full blur-[100px]" />
                </motion.div>
            </header>

            {/* ── FEATURES SECTION ── */}
            <section className="relative py-24 px-6 z-10 bg-[#050507]/80 backdrop-blur-md">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-5xl font-bold mb-4">Powerful Ecosystem</h2>
                        <p className="text-white/40 max-w-xl mx-auto font-medium">Built for speed, accuracy, and enterprise scalability.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {features.map((f, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="group p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all relative overflow-hidden"
                            >
                                <div className={`absolute top-0 left-0 w-24 h-24 bg-gradient-to-br ${f.color} blur-3xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                        {f.icon}
                                    </div>
                                    <h3 className="text-xl font-bold mb-3 group-hover:text-white transition-colors">{f.title}</h3>
                                    <p className="text-white/40 text-sm leading-relaxed group-hover:text-white/60 transition-colors font-medium">
                                        {f.desc}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA SECTION ── */}
            <section className="relative py-32 px-6 z-10 overflow-hidden">
                <div className="max-w-4xl mx-auto">
                    <div 
                        className="relative rounded-[3rem] p-12 text-center border border-white/10 overflow-hidden bg-gradient-to-b from-white/5 to-transparent"
                    >
                        {/* Background Light */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-violet-600/10 blur-[120px]" />
                        
                        <div className="relative z-10">
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to upgrade your workflow?</h2>
                            <p className="text-white/50 mb-10 text-lg max-w-lg mx-auto font-medium">Join thousands of users leveraging Lucy AI to organize knowledge and boost productivity.</p>
                            <button 
                                onClick={onGetStarted}
                                className="px-10 py-5 rounded-2xl bg-white text-black font-extrabold text-lg hover:bg-gray-200 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-2 mx-auto active:scale-95"
                            >
                                Start Building Now <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FOOTER ── */}
            <footer className="relative py-12 px-6 z-10 border-t border-white/5 bg-black/40">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Lucy AI" className="w-8 h-8 opacity-60" />
                        <span className="text-sm font-bold text-white/40">Lucy AI © 2026</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-white/40 font-medium">
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-white transition-colors">Documentation</a>
                        <a href="#" className="hover:text-white transition-colors">Contact</a>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors">
                            <Globe className="w-4 h-4 text-white/40" />
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 cursor-pointer transition-colors">
                            <Zap className="w-4 h-4 text-white/40" />
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
