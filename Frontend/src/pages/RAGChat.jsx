import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    FileText, Globe, Upload, Trash2, MessageSquare,
    Send, Zap, ChevronRight, X, Loader2, FileUp,
    BookOpen, Link2, CheckCircle2, AlertCircle, Hash
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';

const BASE_URL = 'http://localhost:5000';

// ─── helpers ─────────────────────────────────────
function getAuthHeaders() {
    const token = localStorage.getItem('klausai_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function typeIcon(type) {
    if (type === 'pdf')  return <FileText className="w-4 h-4 text-rose-400" />;
    if (type === 'url')  return <Globe    className="w-4 h-4 text-sky-400"  />;
    return                      <FileText className="w-4 h-4 text-amber-400"/>;
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── RAGChat Component ────────────────────────────
export default function RAGChat() {
    const [documents,    setDocuments]    = useState([]);
    const [activeDoc,    setActiveDoc]    = useState(null);
    const [messages,     setMessages]     = useState([]);
    const [input,        setInput]        = useState('');
    const [loading,      setLoading]      = useState(false);
    const [uploading,    setUploading]    = useState(false);
    const [urlInput,     setUrlInput]     = useState('');
    const [urlMode,      setUrlMode]      = useState(false);
    const [dragging,     setDragging]     = useState(false);
    const [docsLoading,  setDocsLoading]  = useState(true);

    const messagesEndRef = useRef(null);
    const fileInputRef   = useRef(null);
    const inputRef       = useRef(null);

    // ── fetch document list ──────────────────────
    const fetchDocuments = useCallback(async () => {
        try {
            setDocsLoading(true);
            const { data } = await axios.get(`${BASE_URL}/api/rag/documents`, {
                headers: getAuthHeaders(),
            });
            setDocuments(data);
        } catch {
            toast.error('Failed to load documents.');
        } finally {
            setDocsLoading(false);
        }
    }, []);

    useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

    // ── auto-scroll ──────────────────────────────
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // ── select a document ────────────────────────
    function selectDoc(doc) {
        setActiveDoc(doc);
        setMessages([{
            role:   'assistant',
            content: `I've loaded **${doc.filename}** (${doc.totalPages} page${doc.totalPages !== 1 ? 's' : ''}). Ask me anything about it!`,
        }]);
        setTimeout(() => inputRef.current?.focus(), 100);
    }

    // ── upload file ──────────────────────────────
    async function uploadFile(file) {
        const allowed = ['pdf', 'txt', 'md', 'markdown'];
        const ext     = file.name.split('.').pop().toLowerCase();
        if (!allowed.includes(ext)) {
            toast.error('Only PDF, TXT, and MD files are supported.');
            return;
        }
        setUploading(true);
        try {
            const form = new FormData();
            form.append('file', file);
            const { data } = await axios.post(`${BASE_URL}/api/rag/upload`, form, {
                headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
            });
            toast.success(`Indexed "${data.filename}" — ${data.pages} page${data.pages !== 1 ? 's' : ''}`);
            await fetchDocuments();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Upload failed.');
        } finally {
            setUploading(false);
        }
    }

    // ── index URL ────────────────────────────────
    async function indexUrl(e) {
        e.preventDefault();
        if (!urlInput.trim()) return;
        setUploading(true);
        try {
            const { data } = await axios.post(`${BASE_URL}/api/rag/url`,
                { url: urlInput.trim() },
                { headers: getAuthHeaders() },
            );
            toast.success(`Indexed "${data.filename}"`);
            setUrlInput('');
            setUrlMode(false);
            await fetchDocuments();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to index URL.');
        } finally {
            setUploading(false);
        }
    }

    // ── delete document ──────────────────────────
    async function deleteDoc(docId, e) {
        e.stopPropagation();
        try {
            await axios.delete(`${BASE_URL}/api/rag/documents/${docId}`, {
                headers: getAuthHeaders(),
            });
            if (activeDoc?.docId === docId) {
                setActiveDoc(null);
                setMessages([]);
            }
            setDocuments(prev => prev.filter(d => d.docId !== docId));
            toast.success('Document removed.');
        } catch {
            toast.error('Failed to delete document.');
        }
    }

    // ── chat ─────────────────────────────────────
    async function sendMessage(e) {
        e.preventDefault();
        if (!input.trim() || !activeDoc || loading) return;

        const userMsg = { role: 'user', content: input.trim() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const { data } = await axios.post(`${BASE_URL}/api/rag/chat`, {
                docId:   activeDoc.docId,
                query:   userMsg.content,
                history: messages.filter(m => m.role !== 'system'),
            }, { headers: getAuthHeaders() });

            setMessages(prev => [...prev, {
                role:        'assistant',
                content:     data.answer,
                sourcedPages: data.sourcedPages,
            }]);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to get a response.');
            setMessages(prev => [...prev, {
                role:    'assistant',
                content: 'Sorry, something went wrong. Please try again.',
                error:   true,
            }]);
        } finally {
            setLoading(false);
        }
    }

    // ── drag & drop ──────────────────────────────
    function onDrop(e) {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) uploadFile(file);
    }

    // ── render message ────────────────────────────
    function renderMessage(msg, i) {
        const isUser = msg.role === 'user';
        return (
            <div key={i} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-4`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${
                    isUser
                        ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white'
                        : 'bg-white/[0.08] border border-white/[0.08] text-gray-400'
                }`}>
                    {isUser ? 'U' : <Zap className="w-4 h-4 text-violet-400" />}
                </div>

                {/* Bubble */}
                <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                        isUser
                            ? 'bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-tr-sm'
                            : msg.error
                                ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-tl-sm'
                                : 'bg-white/[0.06] border border-white/[0.06] text-gray-200 rounded-tl-sm'
                    }`}>
                        {/* Render bold markdown */}
                        {msg.content.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
                            part.startsWith('**') && part.endsWith('**')
                                ? <strong key={j} className="font-semibold text-white">{part.slice(2, -2)}</strong>
                                : part
                        )}
                    </div>

                    {/* Source page pills */}
                    {msg.sourcedPages && msg.sourcedPages.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap mt-0.5">
                            <Hash className="w-3 h-3 text-gray-600" />
                            {msg.sourcedPages.map(p => (
                                <span key={p} className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 font-medium">
                                    p.{p}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ────────────────────────────────────────────
    return (
        <div className="flex h-screen bg-[#0a0a0b] text-gray-100 font-sans overflow-hidden">

            {/* ── LEFT SIDEBAR ───────────────────────── */}
            <aside className="w-72 flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-white/[0.02]">

                {/* Header */}
                <div className="p-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
                            <BookOpen className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-semibold text-sm text-gray-100">Document RAG</span>
                    </div>

                    {/* Upload area */}
                    {!urlMode ? (
                        <div
                            className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                                dragging
                                    ? 'border-violet-500/60 bg-violet-500/10'
                                    : 'border-white/[0.10] hover:border-white/20 hover:bg-white/[0.03]'
                            }`}
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={onDrop}
                        >
                            {uploading ? (
                                <Loader2 className="w-6 h-6 text-violet-400 animate-spin mx-auto mb-1" />
                            ) : (
                                <FileUp className="w-6 h-6 text-gray-500 mx-auto mb-1" />
                            )}
                            <p className="text-xs text-gray-400">
                                {uploading ? 'Indexing…' : 'Drop file or click to upload'}
                            </p>
                            <p className="text-[10px] text-gray-600 mt-0.5">PDF · TXT · MD</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.txt,.md,.markdown"
                                className="hidden"
                                onChange={e => { if (e.target.files[0]) uploadFile(e.target.files[0]); }}
                            />
                        </div>
                    ) : (
                        <form onSubmit={indexUrl} className="space-y-2">
                            <div className="relative">
                                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                                <input
                                    type="url"
                                    value={urlInput}
                                    onChange={e => setUrlInput(e.target.value)}
                                    placeholder="https://example.com/article"
                                    className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg pl-8 pr-3 py-2 text-xs text-gray-200 placeholder-gray-600 outline-none focus:border-violet-500/50"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={uploading || !urlInput.trim()}
                                    className="flex-1 py-2 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-500 disabled:opacity-50 transition-colors"
                                >
                                    {uploading ? 'Indexing…' : 'Index URL'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUrlMode(false)}
                                    className="px-3 py-2 rounded-lg border border-white/[0.08] text-gray-400 hover:bg-white/[0.04] text-xs transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Toggle URL mode */}
                    {!urlMode && (
                        <button
                            onClick={() => setUrlMode(true)}
                            className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-white/[0.06] text-xs text-gray-500 hover:text-gray-300 hover:bg-white/[0.03] transition-colors"
                        >
                            <Globe className="w-3.5 h-3.5" /> Index a URL instead
                        </button>
                    )}
                </div>

                {/* Document list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {docsLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-8 px-4">
                            <FileText className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                            <p className="text-xs text-gray-600">No documents yet.<br />Upload one to get started.</p>
                        </div>
                    ) : (
                        documents.map(doc => (
                            <button
                                key={doc.docId}
                                onClick={() => selectDoc(doc)}
                                className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl text-left transition-all group ${
                                    activeDoc?.docId === doc.docId
                                        ? 'bg-violet-600/20 border border-violet-500/30'
                                        : 'hover:bg-white/[0.04] border border-transparent'
                                }`}
                            >
                                <div className="mt-0.5">{typeIcon(doc.type)}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-gray-200 truncate">{doc.filename}</p>
                                    <p className="text-[10px] text-gray-600 mt-0.5">
                                        {doc.totalPages} page{doc.totalPages !== 1 ? 's' : ''} · {formatDate(doc.createdAt)}
                                    </p>
                                </div>
                                <button
                                    onClick={(e) => deleteDoc(doc.docId, e)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </button>
                        ))
                    )}
                </div>
            </aside>

            {/* ── MAIN CHAT AREA ─────────────────────── */}
            <main className="flex-1 flex flex-col overflow-hidden">

                {/* Chat header */}
                <div className="h-14 flex-shrink-0 flex items-center px-6 border-b border-white/[0.06] bg-white/[0.01]">
                    {activeDoc ? (
                        <div className="flex items-center gap-3 min-w-0">
                            {typeIcon(activeDoc.type)}
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-200 truncate">{activeDoc.filename}</p>
                                <p className="text-[11px] text-gray-600">{activeDoc.totalPages} pages · BM25 retrieval</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-gray-600">
                            <MessageSquare className="w-4 h-4" />
                            <span className="text-sm">Select a document to start chatting</span>
                        </div>
                    )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {!activeDoc ? (
                        /* Empty state */
                        <div className="h-full flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-4">
                                <BookOpen className="w-8 h-8 text-gray-600" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-400 mb-2">No document selected</h2>
                            <p className="text-sm text-gray-600 max-w-xs">
                                Upload a PDF, text file, or web URL from the sidebar, then select it to start a conversation.
                            </p>
                            <div className="mt-6 flex flex-col gap-2 text-xs text-gray-600">
                                {[
                                    ['Upload a PDF', 'Research papers, reports, manuals'],
                                    ['Index a URL', 'Articles, documentation, blog posts'],
                                    ['Upload TXT/MD', 'Notes, transcripts, markdown files'],
                                ].map(([title, sub]) => (
                                    <div key={title} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                                        <div className="text-left">
                                            <span className="font-medium text-gray-400">{title}</span>
                                            <span className="text-gray-600"> — {sub}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Message thread */
                        <div className="max-w-3xl mx-auto">
                            {messages.map(renderMessage)}
                            {loading && (
                                <div className="flex gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-xl bg-white/[0.08] border border-white/[0.08] flex items-center justify-center">
                                        <Zap className="w-4 h-4 text-violet-400" />
                                    </div>
                                    <div className="px-4 py-3 bg-white/[0.06] border border-white/[0.06] rounded-2xl rounded-tl-sm">
                                        <div className="flex gap-1">
                                            {[0, 1, 2].map(i => (
                                                <span
                                                    key={i}
                                                    className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"
                                                    style={{ animationDelay: `${i * 0.15}s` }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input bar */}
                <div className="flex-shrink-0 p-4 border-t border-white/[0.06]">
                    <form
                        onSubmit={sendMessage}
                        className="max-w-3xl mx-auto flex items-end gap-3"
                    >
                        <div className="flex-1 relative">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        sendMessage(e);
                                    }
                                }}
                                disabled={!activeDoc || loading}
                                placeholder={activeDoc ? 'Ask a question about the document…' : 'Select a document first…'}
                                rows={1}
                                className="w-full bg-white/[0.06] border border-white/[0.08] rounded-2xl px-4 py-3 pr-12 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 resize-none disabled:opacity-40 transition-all"
                                style={{ maxHeight: '120px', overflowY: 'auto' }}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={!activeDoc || !input.trim() || loading}
                            className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20 hover:-translate-y-0.5"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                    <p className="text-center text-[10px] text-gray-700 mt-2">
                        Enter to send · Shift+Enter for new line · Powered by BM25 + Claude
                    </p>
                </div>
            </main>
        </div>
    );
}