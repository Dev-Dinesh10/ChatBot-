import React, { useState, useRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Menu, Plus, MessageSquare,
  Send, Copy, Sparkles,
  Trash2, StopCircle, Zap, Download, Share2, PanelLeft, LayoutDashboard, LogOut, BookOpen
} from 'lucide-react';
import axios from 'axios';
import { useChatStream } from './hooks/useChatStream';
import Dashboard from './components/DashboardCharts';
import DeleteModal from './components/DeleteModal';
import Login from './pages/Login';
import Register from './pages/Register';
import RAGChat from './pages/Ragchat';
import Landing from './pages/Landing';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const BASE_URL = 'http://localhost:5000';

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState('chat'); // 'chat' | 'dashboard' | 'rag'
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const { startStream, stopStream, streaming } = useChatStream(BASE_URL);

  const [authPage, setAuthPage] = useState('landing'); // 'landing' | 'login' | 'register'

  // Open sidebar by default on desktop
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    setSidebarOpen(mq.matches);
    const handler = (e) => setSidebarOpen(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── RESTORE SESSION FROM LOCALSTORAGE ──
  useEffect(() => {
    const savedToken = localStorage.getItem('genai_token');
    const savedUser = localStorage.getItem('genai_user');
    if (savedToken && savedUser) {
      setSession({ user: JSON.parse(savedUser), accessToken: savedToken });
    }
    setAuthLoading(false);
  }, []);

  const handleLogin = (token, user) => {
    setSession({ user, accessToken: token });
  };

  const handleLogout = () => {
    localStorage.removeItem('genai_token');
    localStorage.removeItem('genai_user');
    setSession(null);
    setMessages([]);
    setThreads([]);
    setActiveThreadId(null);
    toast.success('Logged out successfully');
  };

  // ── LOAD THREADS ──
  const fetchThreads = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/chat/threads`, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      setThreads(res.data);
    } catch (err) {
      console.error('Fetch threads failed', err);
    }
  };

  useEffect(() => {
    if (session) fetchThreads();
  }, [session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  // ── SELECT THREAD ──
  const selectThread = async (id) => {
    setActiveThreadId(id);
    try {
      const res = await axios.get(`${BASE_URL}/api/chat/threads/${id}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      setMessages(res.data.messages || []);
      // Close sidebar on mobile after selecting
      if (window.innerWidth < 768) setSidebarOpen(false);
    } catch (err) {
      console.error('Load thread failed', err);
    }
  };

  // ── CREATE THREAD ──
  const createNewThread = async () => {
    try {
      const res = await axios.post(`${BASE_URL}/api/chat/threads`, {}, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      setThreads([res.data, ...threads]);
      setActiveThreadId(res.data._id);
      setMessages([]);
      if (window.innerWidth < 768) setSidebarOpen(false);
    } catch (err) {
      console.error('Create thread failed', err);
    }
  };

  // ── DELETE THREAD ──
  const deleteThread = async (id, e) => {
    e.stopPropagation();
    setPendingDeleteId(id);
    setShowDeleteModal(true);
  };

  const performDelete = async () => {
    const id = pendingDeleteId;
    if (!id) return;
    try {
      await axios.delete(`${BASE_URL}/api/chat/threads/${id}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      setThreads(threads.filter(t => t._id !== id));
      if (activeThreadId === id) {
        setActiveThreadId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Delete failed', err);
    } finally {
      setShowDeleteModal(false);
      setPendingDeleteId(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPendingDeleteId(null);
  };

  const handleSend = async () => {
    if (!input.trim() || streaming) return;

    let currentThreadId = activeThreadId;
    if (!currentThreadId) {
      const res = await axios.post(`${BASE_URL}/api/chat/threads`, {}, {
        headers: { Authorization: `Bearer ${session.accessToken}` }
      });
      currentThreadId = res.data._id;
      setActiveThreadId(currentThreadId);
      setThreads([res.data, ...threads]);
    }

    const userMsg = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages([...newMessages, { role: 'assistant', content: '', streaming: true }]);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    startStream(
      newMessages,
      currentThreadId,
      session.accessToken,
      (chunk, full) => {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: full, streaming: true };
          return next;
        });
      },
      (full) => {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: full, streaming: false };
          return next;
        });
        fetchThreads();
      },
      (err) => {
        setMessages(prev => {
          const next = [...prev];
          next[next.length - 1] = { role: 'assistant', content: `⚠️ Error: ${err}`, streaming: false };
          return next;
        });
      }
    );
  };

  // ── EXPORT & SHARE ──
  const exportPDF = async () => {
    if (!activeThreadId) return;
    try {
      const response = await axios.post(`${BASE_URL}/api/export/pdf`,
        { threadId: activeThreadId },
        {
          headers: { Authorization: `Bearer ${session.accessToken}` },
          responseType: 'blob'
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `chat-${activeThreadId}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (err) { toast.error('Export failed'); }
  };

  const shareChat = async () => {
    if (!activeThreadId) return;
    try {
      const res = await axios.post(`${BASE_URL}/api/export/share`,
        { threadId: activeThreadId },
        { headers: { Authorization: `Bearer ${session.accessToken}` } }
      );
      navigator.clipboard.writeText(res.data.shareUrl);
      toast.success('Share link copied to clipboard!');
    } catch (err) { toast.error('Share failed'); }
  };

  // ── LOADING GUARD ──
  if (authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0b]">
        <div className="flex flex-col items-center gap-4">
          <img src="/logo.png" alt="Lucy AI Logo" className="w-16 h-16 object-contain animate-pulse drop-shadow-2xl" />
          <p className="text-gray-500 text-sm">Starting Lucy AI...</p>
        </div>
      </div>
    );
  }

  // ── AUTH GATE ──
  if (!session) {
    if (authPage === 'landing') {
      return (
        <>
          <ToastContainer theme="dark" position="top-right" autoClose={3000} />
          <Landing 
            onGetStarted={() => setAuthPage('register')} 
            onLogin={() => setAuthPage('login')} 
          />
        </>
      );
    }
    return (
      <>
        <ToastContainer theme="dark" position="top-right" autoClose={3000} />
        {authPage === 'register' ? (
          <Register onLogin={handleLogin} goToLogin={() => setAuthPage('login')} goToLanding={() => setAuthPage('landing')} />
        ) : (
          <Login onLogin={handleLogin} goToRegister={() => setAuthPage('register')} goToLanding={() => setAuthPage('landing')} />
        )}
      </>
    );
  }

  // ── Shared Mini Nav (desktop sidebar icons) ──
  const MiniNav = ({ current }) => (
    <aside className="w-14 flex-shrink-0 border-r border-white/5 bg-[#0f0f11] flex flex-col items-center py-4 gap-3">
      <button onClick={() => setView('chat')}
        className={`p-2.5 rounded-xl transition-all ${current === 'chat' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'bg-white/5 text-gray-400 hover:text-white'}`}
        title="Chat"><MessageSquare className="w-4 h-4" /></button>
      <button onClick={() => setView('dashboard')}
        className={`p-2.5 rounded-xl transition-all ${current === 'dashboard' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'bg-white/5 text-gray-400 hover:text-white'}`}
        title="Dashboard"><LayoutDashboard className="w-4 h-4" /></button>
      <button onClick={() => setView('rag')}
        className={`p-2.5 rounded-xl transition-all ${current === 'rag' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'bg-white/5 text-gray-400 hover:text-white'}`}
        title="Documents"><BookOpen className="w-4 h-4" /></button>
    </aside>
  );

  // ── Mobile Bottom Navigation ──
  const MobileBottomNav = ({ current }) => (
    <nav className="md:hidden flex-shrink-0 flex items-center justify-around border-t border-white/5 bg-[#0f0f11] py-2 px-2 safe-area-inset-bottom">
      {[
        { id: 'chat', icon: <MessageSquare className="w-5 h-5" />, label: 'Chat' },
        { id: 'dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Analytics' },
        { id: 'rag', icon: <BookOpen className="w-5 h-5" />, label: 'Docs' },
      ].map(item => (
        <button key={item.id} onClick={() => setView(item.id)}
          className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${current === item.id ? 'text-violet-400' : 'text-gray-500 hover:text-gray-300'}`}>
          {item.icon}
          <span className="text-[9px] font-medium">{item.label}</span>
        </button>
      ))}
      <button onClick={handleLogout}
        className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all text-gray-500 hover:text-red-400">
        <LogOut className="w-5 h-5" />
        <span className="text-[9px] font-medium">Logout</span>
      </button>
    </nav>
  );

  // ── RAG VIEW ──
  if (view === 'rag') {
    return (
      <>
        <ToastContainer theme="dark" position="top-right" autoClose={3000} />
        <div className="flex flex-col h-screen bg-[#0a0a0b] overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            <div className="hidden md:flex"><MiniNav current="rag" /></div>
            <div className="flex-1 overflow-hidden"><RAGChat /></div>
          </div>
          <MobileBottomNav current="rag" />
        </div>
      </>
    );
  }

  // ── DASHBOARD VIEW ──
  if (view === 'dashboard') {
    return (
      <>
        <ToastContainer theme="dark" position="top-right" autoClose={3000} />
        <div className="flex flex-col h-screen bg-[#0a0a0b] overflow-hidden">
          <div className="flex flex-1 overflow-hidden">
            <div className="hidden md:flex"><MiniNav current="dashboard" /></div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <Dashboard token={session.accessToken} />
            </div>
          </div>
          <MobileBottomNav current="dashboard" />
        </div>
      </>
    );
  }

  // ── CHAT VIEW ──
  return (
    <>
      <ToastContainer theme="dark" position="top-right" autoClose={3000} />
      <DeleteModal show={showDeleteModal} onCancel={cancelDelete} onConfirm={performDelete} />
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0a0b] text-white selection:bg-purple-500/30">

        <div className="flex flex-1 overflow-hidden relative">

          {/* ── MOBILE BACKDROP ── */}
          {sidebarOpen && (
            <div
              className="md:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* ── SIDEBAR ── */}
          <div className={`
            fixed md:relative z-40 h-full flex-shrink-0 flex flex-col
            transition-transform duration-300 ease-in-out
            border-r border-white/5 bg-[#0f0f11]
            w-64
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-none md:overflow-hidden'}
          `}>
            {/* Logo row */}
            <div className="p-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 font-semibold">
                <img src="/logo.png" alt="Lucy AI Logo" className="w-12 h-12 object-contain drop-shadow-md" />
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>

            {/* New Chat */}
            <div className="px-4 pb-4 flex-shrink-0">
              <button
                onClick={createNewThread}
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-all group"
              >
                <Plus className="w-4 h-4 text-gray-400 group-hover:text-white" />
                <span>New Chat</span>
              </button>
            </div>

            {/* Thread list */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1">
              {threads.map(t => (
                <button
                  key={t._id}
                  onClick={() => selectThread(t._id)}
                  className={`w-full group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeThreadId === t._id ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
                >
                  <MessageSquare className={`w-4 h-4 flex-shrink-0 ${activeThreadId === t._id ? 'text-violet-400' : 'text-gray-500'}`} />
                  <span className="truncate flex-1 text-left">{t.title}</span>
                  <Trash2
                    onClick={(e) => deleteThread(t._id, e)}
                    className="w-3.5 h-3.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  />
                </button>
              ))}
            </div>

            {/* Bottom user area */}
            <div className="p-4 mt-auto border-t border-white/5 space-y-1 flex-shrink-0">
              <button onClick={() => setView('dashboard')}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all">
                <LayoutDashboard className="w-4 h-4" />Dashboard
              </button>
              <button onClick={() => setView('rag')}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all">
                <BookOpen className="w-4 h-4" />Documents
              </button>
              <div className="flex items-center gap-3 px-2 py-2 mt-1">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-xs font-bold uppercase flex-shrink-0">
                  {session?.user?.name?.[0] || 'U'}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-xs font-semibold text-gray-200 truncate">{session?.user?.name || 'User'}</p>
                  <p className="text-[10px] text-gray-500 truncate">{session?.user?.email}</p>
                </div>
                <button onClick={handleLogout} title="Logout" className="flex-shrink-0 p-1 rounded-lg hover:bg-red-500/10 transition-colors">
                  <LogOut className="w-4 h-4 text-gray-500 hover:text-red-400 transition-colors" />
                </button>
              </div>
            </div>
          </div>

          {/* ── MAIN CHAT AREA ── */}
          <div className="flex-1 flex flex-col h-full relative min-w-0 bg-[#0a0a0b]">

            {/* Header */}
            <header className="h-14 flex items-center justify-between px-3 md:px-4 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md sticky top-0 z-10 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setSidebarOpen(s => !s)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors flex-shrink-0"
                  title="Toggle sidebar"
                >
                  <PanelLeft className="w-5 h-5" />
                </button>
                <h2 className="text-sm font-medium text-gray-300 truncate">
                  {activeThreadId ? threads.find(t => t._id === activeThreadId)?.title : 'Select or start a chat'}
                </h2>
              </div>
              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                {activeThreadId && (
                  <>
                    <button onClick={exportPDF} title="Export PDF" className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                      <Download className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button onClick={shareChat} title="Share Link" className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                      <Share2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  </>
                )}
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02]">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Live</span>
                </div>
              </div>
            </header>

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto">
                  <div className="mb-10">
                    <img src="/logo.png" alt="Lucy AI" className="w-48 h-48 md:w-56 md:h-56 object-contain drop-shadow-[0_0_50px_rgba(124,58,237,0.35)] hover:scale-105 transition-transform duration-700" />
                  </div>
                  <h1 className="text-xl md:text-2xl font-bold text-white mb-2">Welcome to Lucy AI</h1>
                  <p className="text-gray-500 text-sm mb-10">Start a new conversation to experience high-speed streaming AI with memory.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full animate-fade-up" style={{ animationDelay: '0.2s' }}>
                    {[
                      { 
                        icon: <BookOpen className="w-4 h-4 text-violet-400" />, 
                        title: "Document RAG", 
                        desc: "Analyze your PDFs & files",
                        action: () => setView('rag')
                      },
                      { 
                        icon: <LayoutDashboard className="w-4 h-4 text-indigo-400" />, 
                        title: "Live Analytics", 
                        desc: "Check your usage metrics",
                        action: () => setView('dashboard')
                      },
                      { 
                        icon: <Sparkles className="w-4 h-4 text-amber-400" />, 
                        title: "Explain Concept", 
                        desc: "Break down complex topics",
                        action: () => setInput("Can you explain how Quantum Computing works in simple terms?")
                      },
                      { 
                        icon: <MessageSquare className="w-4 h-4 text-sky-400" />, 
                        title: "Write & Edit", 
                        desc: "Draft emails or code",
                        action: () => setInput("Help me write a professional follow-up email for a job interview.")
                      }
                    ].map((item, i) => (
                      <button 
                        key={i}
                        onClick={item.action}
                        className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 transition-all text-left group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                          {item.icon}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-200">{item.title}</p>
                          <p className="text-[11px] text-gray-500">{item.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="pb-36 pt-4 md:pt-6 flex flex-col gap-6 md:gap-8 max-w-3xl mx-auto w-full px-3 md:px-4">
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex flex-col gap-3 ${msg.role === 'user' ? 'items-end' : 'items-start'} group animate-fade-up`}
                      style={{ animationDelay: `${i * 0.05}s` }}
                    >
                      {msg.role === 'user' ? (
                        <div className="flex flex-col items-end gap-1.5 max-w-[90%] md:max-w-[80%]">
                          <div className="flex items-center gap-2 px-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">You</span>
                          </div>
                          <div className="relative group/bubble">
                            <div className="bg-gradient-to-br from-violet-600/90 to-indigo-600/90 text-white px-4 md:px-5 py-3 rounded-2xl rounded-tr-sm shadow-lg shadow-violet-500/10 border border-white/10 backdrop-blur-sm">
                              <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
                                {msg.content}
                              </p>
                            </div>
                            {/* Subtle reflection effect */}
                            <div className="absolute inset-0 rounded-2xl rounded-tr-sm bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3 md:gap-4 w-full">
                          {/* AI Avatar */}
                          <div className="relative flex-shrink-0 mt-1">
                            <div className="w-11 h-11 md:w-12 md:h-12 rounded-xl overflow-hidden bg-[#18181c] shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform border border-white/10">
                              <img src="/logo.png" alt="Lucy AI" className="w-full h-full object-contain" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0a0a0b] rounded-full" />
                          </div>

                          <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                            <div className="flex items-center justify-between px-1">
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lucy AI</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(msg.content);
                                  toast.success('Copied to clipboard', { position: 'bottom-right', autoClose: 2000 });
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white"
                                title="Copy response"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="relative group/ai-bubble">
                              <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl rounded-tl-sm p-4 md:p-5 shadow-sm hover:bg-white/[0.04] transition-colors relative overflow-hidden">
                                <div className="markdown-body text-sm md:text-[15px] text-gray-200 leading-relaxed font-normal">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      code({ node, inline, className, children, ...props }) {
                                        const match = /language-(\w+)/.exec(className || '');
                                        return !inline && match ? (
                                          <div className="relative group/code my-4">
                                            <div className="absolute right-3 top-3 z-10 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                              <button
                                                onClick={() => {
                                                  navigator.clipboard.writeText(String(children));
                                                  toast.success('Code copied');
                                                }}
                                                className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-gray-300 transition-colors"
                                              >
                                                <Copy className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                            <SyntaxHighlighter
                                              style={vscDarkPlus}
                                              language={match[1]}
                                              PreTag="div"
                                              className="!bg-[#0d0d12] !p-4 !rounded-xl !border !border-white/5 !m-0"
                                              {...props}
                                            >
                                              {String(children).replace(/\n$/, '')}
                                            </SyntaxHighlighter>
                                          </div>
                                        ) : (
                                          <code className="bg-white/10 px-1.5 py-0.5 rounded text-violet-300 font-mono text-[0.9em]" {...props}>
                                            {children}
                                          </code>
                                        );
                                      },
                                      p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                                      ul: ({ children }) => <ul className="list-disc ml-4 mb-4 space-y-2">{children}</ul>,
                                      ol: ({ children }) => <ol className="list-decimal ml-4 mb-4 space-y-2">{children}</ol>,
                                      strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                                      h1: ({ children }) => <h1 className="text-xl font-bold text-white mb-4">{children}</h1>,
                                      h2: ({ children }) => <h2 className="text-lg font-bold text-white mb-3">{children}</h2>,
                                      blockquote: ({ children }) => (
                                        <blockquote className="border-l-4 border-violet-500/50 bg-violet-500/5 px-4 py-2 my-4 italic rounded-r-lg">
                                          {children}
                                        </blockquote>
                                      ),
                                    }}
                                  >
                                    {msg.content}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={bottomRef} className="h-4" />
                </div>
              )}
            </div>

            {/* INPUT BOX */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b]/95 to-transparent pt-8 pb-3 md:pb-5 px-3 md:px-4">
              <div className="max-w-3xl mx-auto">
                <div className="relative rounded-2xl bg-[#1a1a1e] border border-white/10 shadow-2xl focus-within:border-violet-500/50 transition-all">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    className="w-full bg-transparent border-none outline-none text-gray-100 text-sm md:text-[15px] resize-none py-3.5 md:py-4 px-4 md:px-5 pr-14"
                    placeholder="Message Lucy AI..."
                    value={input}
                    onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'; }}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                    disabled={streaming}
                  />
                  <div className="absolute right-3 bottom-2.5">
                    {streaming ? (
                      <button onClick={stopStream} className="p-2 text-violet-400 hover:bg-white/5 rounded-xl"><StopCircle /></button>
                    ) : (
                      <button onClick={handleSend} disabled={!input.trim()} className="p-2 bg-white text-black hover:bg-gray-200 rounded-xl disabled:bg-gray-800 disabled:text-gray-600 transition-colors">
                        <Send className="w-4 h-4 md:w-5 md:h-5 ml-0.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-center text-[10px] text-gray-600 mt-2 hidden sm:block">Enter to send · Shift+Enter for new line</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── MOBILE BOTTOM NAV ── */}
        <nav className="md:hidden flex-shrink-0 flex items-center justify-around border-t border-white/5 bg-[#0f0f11] py-2 px-2">
          {[
            { id: 'chat', icon: <MessageSquare className="w-5 h-5" />, label: 'Chat' },
            { id: 'dashboard', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Analytics' },
            { id: 'rag', icon: <BookOpen className="w-5 h-5" />, label: 'Docs' },
          ].map(item => (
            <button key={item.id} onClick={() => setView(item.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${view === item.id ? 'text-violet-400' : 'text-gray-500 hover:text-gray-300'}`}>
              {item.icon}
              <span className="text-[9px] font-medium">{item.label}</span>
            </button>
          ))}
          <button onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all text-gray-500 hover:text-red-400">
            <LogOut className="w-5 h-5" />
            <span className="text-[9px] font-medium">Logout</span>
          </button>
        </nav>
      </div>
    </>
  );
}