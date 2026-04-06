import { useState, useRef } from 'react';

export const useChatStream = (baseUrl) => {
    const [streaming, setStreaming] = useState(false);
    const abortControllerRef = useRef(null);

    const startStream = async (messages, threadId, token, onChunk, onComplete, onError) => {
        setStreaming(true);
        abortControllerRef.current = new AbortController();

        try {
            const response = await fetch(`${baseUrl}/api/chat/stream`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ messages, threadId }),
                signal: abortControllerRef.current.signal
            });

            // ✅ Handle non-OK responses before reading stream
            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('token');
                    onError('Session expired. Please log in again.');
                    window.location.href = '/login';
                    return;
                }
                throw new Error(`Server error: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') {
                            onComplete(fullText);
                            break;
                        }
                        try {
                            const parsed = JSON.parse(data);
                            if (parsed.content) {
                                fullText += parsed.content;
                                onChunk(parsed.content, fullText);
                            }
                            // ✅ Handle token expiry mid-stream
                            if (parsed.error) {
                                if (parsed.error.toLowerCase().includes('expired') ||
                                    parsed.error.toLowerCase().includes('unauthorized')) {
                                    localStorage.removeItem('token');
                                    onError('Session expired. Please log in again.');
                                    window.location.href = '/login';
                                    return;
                                }
                                throw new Error(parsed.error);
                            }
                        } catch (e) {
                            console.error('JSON Parse Error:', e);
                        }
                    }
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log('Stream aborted');
            } else {
                onError(err.message);
            }
        } finally {
            setStreaming(false);
        }
    };

    const stopStream = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setStreaming(false);
        }
    };

    return { startStream, stopStream, streaming };
};