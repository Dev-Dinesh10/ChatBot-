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
import RAGChat from './pages/RAGChat';                     // ← NEW
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const { startStream, stopStream, streaming } = useChatStream(BASE_URL);

  const [authPage, setAuthPage] = useState('login');

  // ── RESTORE SESSION FROM LOCALSTORAGE ──
  useEffect(() => {
    const savedToken = localStorage.getItem('klausai_token');
    const savedUser = localStorage.getItem('klausai_user');
    if (savedToken && savedUser) {
      setSession({ user: JSON.parse(savedUser), accessToken: savedToken });
    }
    setAuthLoading(false);
  }, []);

  const handleLogin = (token, user) => {
    setSession({ user, accessToken: token });
  };

  const handleLogout = () => {
    localStorage.removeItem('klausai_token');
    localStorage.removeItem('klausai_user');
    setSession(null);
    setMessages([]);
    setThreads([]);
    setActiveThreadId(null);
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
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center animate-pulse">
            <Zap className="w-6 h-6 text-white fill-white" />
          </div>
          <p className="text-gray-500 text-sm">Starting KlausAI...</p>
        </div>
      </div>
    );
  }

  // ── AUTH GATE ──
  if (!session) {
    return (
      <>
        <ToastContainer theme="dark" position="top-right" autoClose={3000} />
        {authPage === 'register' ? (
          <Register onLogin={handleLogin} goToLogin={() => setAuthPage('login')} />
        ) : (
          <Login onLogin={handleLogin} goToRegister={() => setAuthPage('register')} />
        )}
      </>
    );
  }

  // ── RAG VIEW ──                                          ← NEW
  if (view === 'rag') {
    return (
      <>
        <ToastContainer theme="dark" position="top-right" autoClose={3000} />
        <div className="flex bg-[#0a0a0b] h-screen overflow-hidden">
          {/* Mini sidebar for navigation */}
          <aside className="w-16 border-r border-white/5 bg-[#0f0f11] flex flex-col items-center py-6 gap-4">
            <button
              onClick={() => setView('chat')}
              className="p-3 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-all"
              title="Chat"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('dashboard')}
              className="p-3 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-all"
              title="Dashboard"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
            <button
              className="p-3 rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-500/20"
              title="Documents"
            >
              <BookOpen className="w-5 h-5" />
            </button>
          </aside>
          <div className="flex-1 overflow-hidden">
            <RAGChat />
          </div>
        </div>
      </>
    );
  }

  // ── DASHBOARD VIEW ──
  if (view === 'dashboard') {
    return (
      <>
        <ToastContainer theme="dark" position="top-right" autoClose={3000} />
        <div className="flex bg-[#0a0a0b] h-screen overflow-hidden">
          <aside className="w-16 border-r border-white/5 bg-[#0f0f11] flex flex-col items-center py-6 gap-4">
            <button
              onClick={() => setView('chat')}
              className="p-3 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-all"
              title="Chat"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              className="p-3 rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-500/20"
              title="Dashboard"
            >
              <LayoutDashboard className="w-5 h-5" />
            </button>
            <button
              onClick={() => setView('rag')}
              className="p-3 rounded-xl bg-white/5 text-gray-400 hover:text-white transition-all"
              title="Documents"
            >
              <BookOpen className="w-5 h-5" />
            </button>
          </aside>
          <div className="flex-1 overflow-y-auto">
            <Dashboard token={session.accessToken} />
          </div>
        </div>
      </>
    );
  }

  // ── CHAT VIEW ──
  return (
    <>
      <ToastContainer theme="dark" position="top-right" autoClose={3000} />
      <DeleteModal show={showDeleteModal} onCancel={cancelDelete} onConfirm={performDelete} />
      <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0b] text-white selection:bg-purple-500/30">

        {/* ── SIDEBAR ── */}
        <div className={`fixed md:relative z-40 h-full flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out border-r border-white/5 bg-[#0f0f11] ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-0 md:border-none'}`}>
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white fill-white" />
              </div>
              <span>KlausAI</span>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-400"><Menu /></button>
          </div>

          <div className="px-4 pb-4">
            <button
              onClick={createNewThread}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition-all group"
            >
              <Plus className="w-4 h-4 text-gray-400 group-hover:text-white" />
              <span>New Chat</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-2">
            {threads.map(t => (
              <button
                key={t._id}
                onClick={() => selectThread(t._id)}
                className={`w-full group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeThreadId === t._id ? 'bg-white/[0.08] text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`}
              >
                <MessageSquare className={`w-4 h-4 ${activeThreadId === t._id ? 'text-violet-400' : 'text-gray-500'}`} />
                <span className="truncate flex-1 text-left">{t.title}</span>
                <Trash2
                  onClick={(e) => deleteThread(t._id, e)}
                  className="w-3.5 h-3.5 text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </button>
            ))}
          </div>

          <div className="p-4 mt-auto border-t border-white/5 space-y-1">
            <button
              onClick={() => setView('dashboard')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>
            {/* ── Documents / RAG button ── */}
            <button
              onClick={() => setView('rag')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all"
            >
              <BookOpen className="w-4 h-4" />
              Documents
            </button>
            <div className="flex items-center gap-3 px-2 py-2 mt-1">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center text-xs font-bold uppercase">
                {session?.user?.name?.[0] || 'U'}
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold text-gray-200 truncate">{session?.user?.name || 'User'}</p>
                <p className="text-[10px] text-gray-500 truncate">{session?.user?.email}</p>
              </div>
              <button onClick={handleLogout} title="Logout" className="p-1 rounded-lg hover:bg-red-500/10 transition-colors">
                <LogOut className="w-4 h-4 text-gray-500 hover:text-red-400 transition-colors" />
              </button>
            </div>
          </div>
        </div>

        {/* ── MAIN CHAT AREA ── */}
        <div className="flex-1 flex flex-col h-full relative min-w-0 bg-[#0a0a0b]">
          <header className="h-16 flex items-center justify-between px-4 border-b border-white/5 bg-[#0a0a0b]/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-3">
              {!sidebarOpen && <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-400 hover:text-white"><PanelLeft /></button>}
              <h2 className="text-sm font-medium text-gray-300">
                {activeThreadId ? threads.find(t => t._id === activeThreadId)?.title : 'Select or start a chat'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {activeThreadId && (
                <>
                  <button onClick={exportPDF} title="Export PDF" className="p-2 text-gray-400 hover:text-white transition-colors"><Download className="w-5 h-5" /></button>
                  <button onClick={shareChat} title="Share Link" className="p-2 text-gray-400 hover:text-white transition-colors"><Share2 className="w-5 h-5" /></button>
                </>
              )}
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/5 bg-white/[0.02]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Live</span>
              </div>
            </div>
          </header>

          {/* MESSAGES */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center max-w-xl mx-auto">
                <Sparkles className="w-12 h-12 text-violet-500/50 mb-6" />
                <h1 className="text-2xl font-bold text-white mb-2">Welcome to KlausAI</h1>
                <p className="text-gray-500 text-sm">Start a new conversation to experience high-speed streaming AI with memory.</p>
              </div>
            ) : (
              <div className="pb-32 pt-6 flex flex-col gap-6 max-w-3xl mx-auto w-full px-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fade-up`}>
                    {msg.role === 'user' ? (
                      <div className="max-w-[85%] bg-white/10 text-white px-5 py-3 rounded-2xl rounded-tr-md shadow-sm">
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ) : (
                      <div className="flex gap-4 w-full">
                        <div className="w-8 h-8 rounded-full bg-violet-600 flex-shrink-0 flex items-center justify-center shadow-md">
                          <Zap className="w-4 h-4 text-white fill-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="markdown-body text-[15px]">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
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

          {/* INPUT */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a0b] via-[#0a0a0b] to-transparent pt-10 pb-6 px-4">
            <div className="max-w-3xl mx-auto">
              <div className="relative rounded-2xl bg-[#1a1a1e] border border-white/10 shadow-2xl focus-within:border-violet-500/50 transition-all">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  className="w-full bg-transparent border-none outline-none text-gray-100 text-[15px] resize-none py-4 px-5 pr-14"
                  placeholder="Message KlausAI..."
                  value={input}
                  onChange={e => { setInput(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; }}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                  disabled={streaming}
                />
                <div className="absolute right-3 bottom-2.5">
                  {streaming ? (
                    <button onClick={stopStream} className="p-2 text-violet-400 hover:bg-white/5 rounded-xl"><StopCircle /></button>
                  ) : (
                    <button onClick={handleSend} disabled={!input.trim()} className="p-2 bg-white text-black hover:bg-gray-200 rounded-xl disabled:bg-gray-800 disabled:text-gray-600 transition-colors">
                      <Send className="w-5 h-5 ml-0.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}