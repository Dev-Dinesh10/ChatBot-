import { useState, useRef, useEffect } from 'react';

const SUGGESTIONS = [
  { icon: '⚛️', title: 'Quantum computing', text: 'Explain quantum computing simply' },
  { icon: '🌊', title: 'Ocean poem', text: 'Write a short poem about the ocean' },
  { icon: '💻', title: 'Coding practices', text: 'What are the best coding practices?' },
  { icon: '🔬', title: 'Science fact', text: 'Tell me an interesting science fact' },
];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [model] = useState('google/gemma-3-4b-it:free');
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 180) + 'px';
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || streaming) return;

    const history = [...messages, { role: 'user', content: msg }];
    setMessages(history);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setStreaming(true);
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true }]);

    try {
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6);
          if (raw === '[DONE]') break;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.content) {
              aiText += parsed.content;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: 'assistant', content: aiText, streaming: true };
                return next;
              });
            }
          } catch (_) { }
        }
      }
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: aiText, streaming: false };
        return next;
      });
    } catch {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: '⚠️ Connection error. Make sure the backend server is running.', streaming: false };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #0B0F19 0%, #0f111a 50%, #111827 100%)' }}>

      {/* ── RADIAL GLOWS ── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, #7C3AED, transparent 70%)' }} />
        <div className="absolute -bottom-40 -right-20 w-[600px] h-[600px] rounded-full opacity-[0.06]"
          style={{ background: 'radial-gradient(circle, #6366F1, transparent 70%)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ background: 'radial-gradient(circle, #9333EA, transparent 70%)' }} />
      </div>

      {/* ── SIDEBAR ── */}
      <aside className="relative z-10 w-64 flex-shrink-0 flex flex-col p-4 gap-4 border-r border-white/[0.06]"
        style={{ background: 'rgba(15, 17, 26, 0.8)', backdropFilter: 'blur(24px)' }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0 glow-purple-sm"
            style={{ background: 'linear-gradient(135deg, #7C3AED, #6366F1)' }}>
            ⚡
          </div>
          <div>
            <div className="font-bold text-[1.05rem] gradient-text leading-none mb-1">KlausAI</div>
            <div className="text-[9px] text-gray-500 uppercase tracking-widest leading-none">Powered by Dinesh</div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.06]" />

        {/* New Chat */}
        <button
          onClick={() => setMessages([])}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 border"
          style={{
            background: 'rgba(124,58,237,0.12)',
            borderColor: 'rgba(124,58,237,0.3)',
            color: '#a78bfa'
          }}
          onMouseOver={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.22)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(124,58,237,0.2)'; }}
          onMouseOut={e => { e.currentTarget.style.background = 'rgba(124,58,237,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          New Conversation
        </button>

        {/* Model */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-gray-600 font-semibold px-1 mb-2">Active Model</p>
          <div className="glass rounded-xl p-3 flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" style={{ boxShadow: '0 0 8px #34d399' }} />
            <div>
              <p className="text-xs font-medium text-gray-200">Gemma 3 · 4B</p>
              <p className="text-[10px] text-gray-500">Google · Free tier</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto glass rounded-xl p-3 text-center text-[11px] text-gray-500 leading-relaxed">
          Built with <span className="text-violet-400 font-semibold">OpenRouter SDK</span><br />
          React + Express · Free
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="relative z-10 flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]"
          style={{ background: 'rgba(11,15,25,0.7)', backdropFilter: 'blur(20px)' }}>
          <span className="text-sm font-semibold text-gray-300">
            {messages.length === 0 ? 'New Chat' : `Chat · ${messages.filter(m => m.role === 'user').length} messages`}
          </span>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium text-emerald-300"
            style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </div>
        </div>

        {/* Messages or Welcome */}
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin flex flex-col">
          {messages.length === 0 ? (
            /* Welcome screen */
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 gap-6 text-center">
              {/* Floating icon */}
              <div className="animate-float w-20 h-20 rounded-2xl flex items-center justify-center text-4xl glow-purple"
                style={{ background: 'linear-gradient(135deg, #4C1D95, #7C3AED, #6366F1)' }}>
                ⚡
              </div>

              {/* Heading */}
              <div className="space-y-3">
                <h1 className="text-5xl font-black gradient-text leading-tight">
                  How can I<br />help you?
                </h1>
                <p className="text-gray-400 text-base max-w-md leading-relaxed">
                  Ask me anything — I'm here to assist with writing, coding, analysis, and more.
                </p>
              </div>

              {/* Suggestion cards */}
              <div className="grid grid-cols-2 gap-3 max-w-[560px] w-full mt-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s.text)}
                    className="glass glass-hover rounded-2xl p-4 text-left transition-all duration-300 group"
                    style={{ animationDelay: `${i * 0.1}s` }}
                    onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(124,58,237,0.15)'; }}
                    onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
                  >
                    <div className="text-2xl mb-2">{s.icon}</div>
                    <div className="text-sm font-semibold text-gray-200 mb-1">{s.title}</div>
                    <div className="text-xs text-gray-500 leading-relaxed">{s.text}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Messages */
            <div className="py-6 max-w-3xl mx-auto px-6 flex flex-col gap-6 w-full">
              {messages.map((msg, i) => (
                <div key={i} className="flex gap-4 animate-fade-up">
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold mt-0.5 ${msg.role === 'user'
                    ? 'text-white'
                    : 'text-violet-300'
                    }`}
                    style={msg.role === 'user'
                      ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 15px rgba(99,102,241,0.4)' }
                      : { background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)' }
                    }>
                    {msg.role === 'user' ? 'U' : '⚡'}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">
                      {msg.role === 'user' ? 'You' : 'KlausAI'}
                    </p>
                    <p className={`text-[0.95rem] text-gray-200 leading-[1.8] whitespace-pre-wrap ${msg.streaming ? 'after:content-["▍"] after:text-violet-400 after:animate-pulse after:ml-0.5' : ''}`}>
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} className="h-4" />
            </div>
          )}
        </div>

        {/* ── INPUT BAR ── */}
        <div className="px-6 pb-6 pt-3"
          style={{ background: 'linear-gradient(to top, rgba(11,15,25,0.95) 70%, transparent)' }}>
          <div className="max-w-3xl mx-auto">
            {/* Input box */}
            <div className="flex items-end gap-3 rounded-2xl px-5 py-3 transition-all duration-300"
              style={{
                background: 'rgba(20, 24, 40, 0.8)',
                border: '1px solid rgba(124,58,237,0.2)',
                backdropFilter: 'blur(20px)',
              }}
              onFocusCapture={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.08), 0 20px 60px rgba(0,0,0,0.5)'; }}
              onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(124,58,237,0.2)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <textarea
                ref={textareaRef}
                rows={1}
                className="flex-1 bg-transparent border-none outline-none text-gray-200 text-sm leading-relaxed resize-none"
                style={{ minHeight: '26px', maxHeight: '180px', fontFamily: 'Inter, sans-serif' }}
                placeholder="Message KlausAI..."
                value={input}
                onChange={e => { setInput(e.target.value); autoResize(); }}
                onKeyDown={handleKey}
                disabled={streaming}
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || streaming}
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #7C3AED, #6366F1)' }}
                onMouseOver={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(124,58,237,0.5)'; } }}
                onMouseOut={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <p className="text-center text-[11px] text-gray-600 mt-2.5">
              Enter to send · Shift+Enter for new line · KlausAI may make mistakes
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
