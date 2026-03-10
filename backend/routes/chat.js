import express from 'express';
import { OpenRouter } from '@openrouter/sdk';
import Thread from '../models/Thread.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const openrouter = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || ''
});

const MODEL = 'google/gemma-3-4b-it:free';

// ── GET ALL THREADS ──
router.get('/threads', authMiddleware, async (req, res) => {
    try {
        const threads = await Thread.find({ userId: req.user._id })
            .sort({ updatedAt: -1 })
            .select('title updatedAt createdAt');
        res.json(threads);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── GET SINGLE THREAD ──
router.get('/threads/:id', authMiddleware, async (req, res) => {
    try {
        const thread = await Thread.findOne({ _id: req.params.id, userId: req.user._id });
        if (!thread) return res.status(404).json({ error: 'Thread not found' });
        res.json(thread);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── CREATE NEW THREAD ──
router.post('/threads', authMiddleware, async (req, res) => {
    try {
        const thread = await Thread.create({
            userId: req.user._id,
            messages: [],
        });
        res.status(201).json(thread);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── DELETE THREAD ──
router.delete('/threads/:id', authMiddleware, async (req, res) => {
    try {
        await Thread.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        res.json({ message: 'Deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── STREAMING CHAT ENDPOINT ──
router.post('/stream', authMiddleware, async (req, res) => {
    const { messages, threadId } = req.body;

    if (!messages) return res.status(400).json({ error: 'Messages required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullResponse = '';

    try {
        const stream = await openrouter.chat.send({
            chatGenerationParams: {
                model: MODEL,
                messages,
                stream: true
            }
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                fullResponse += content;
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
        }

        // Save history and update thread
        if (threadId) {
            const userMsg = messages[messages.length - 1];
            const assistantMsg = { role: 'assistant', content: fullResponse };

            const thread = await Thread.findById(threadId);
            if (thread) {
                // If it's the first message, auto-generate title
                if (thread.messages.length === 0) {
                    thread.title = userMsg.content.slice(0, 40) + (userMsg.content.length > 40 ? '...' : '');
                }
                thread.messages.push(userMsg, assistantMsg);
                thread.updatedAt = new Date();
                await thread.save();
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error('Stream Error:', error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

export default router;
