import express from 'express';
import PDFDocument from 'pdfkit';
import { v4 as uuidv4 } from 'uuid';
import Thread from '../models/Thread.js';
import SharedChat from '../models/SharedChat.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// ── EXPORT PDF ──
router.post('/pdf', authMiddleware, async (req, res) => {
    const { threadId } = req.body;
    try {
        const thread = await Thread.findOne({ _id: threadId, userId: req.user._id });
        if (!thread) return res.status(404).send('Not found');

        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=chat-${threadId}.pdf`);

        doc.pipe(res);
        doc.fontSize(20).text(`Chat Export: ${thread.title}`, { underline: true });
        doc.moveDown();

        thread.messages.forEach(m => {
            doc.fontSize(12).fillColor(m.role === 'user' ? 'blue' : 'black')
                .text(`${m.role.toUpperCase()}:`, { bold: true });
            doc.fontSize(10).fillColor('black').text(m.content);
            doc.moveDown();
        });

        doc.end();
    } catch (error) {
        res.status(500).send(error.message);
    }
});

// ── SHARE CHAT ──
router.post('/share', authMiddleware, async (req, res) => {
    const { threadId } = req.body;
    try {
        const thread = await Thread.findOne({ _id: threadId, userId: req.user._id });
        if (!thread) return res.status(404).json({ error: 'Not found' });

        const shareId = uuidv4();
        const shared = await SharedChat.create({
            uuid: shareId,
            title: thread.title,
            messages: thread.messages,
        });

        res.json({ shareUrl: `${process.env.FRONTEND_URL}/share/${shareId}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ── PUBLIC VIEW ──
router.get('/share/:uuid', async (req, res) => {
    try {
        const shared = await SharedChat.findOne({ uuid: req.params.uuid });
        if (!shared) return res.status(404).json({ error: 'Expired or not found' });
        res.json(shared);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
