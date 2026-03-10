import express from 'express';
import Thread from '../models/Thread.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const threads = await Thread.find({ userId: req.user._id });

        let totalMessages = 0;
        let tokensToday = 0;
        let tokensThisWeek = 0;
        const now = new Date();
        const today = new Date(now.setHours(0, 0, 0, 0));
        const weekAgo = new Date(now.setDate(now.getDate() - 7));

        const heatmap = {}; // { 'YYYY-MM-DD': count }

        threads.forEach(t => {
            totalMessages += t.messages.length;
            t.messages.forEach(m => {
                const dateStr = m.timestamp.toISOString().split('T')[0];
                heatmap[dateStr] = (heatmap[dateStr] || 0) + 1;

                if (m.timestamp >= today) tokensToday += (m.content.length / 4); // basic estimate
                if (m.timestamp >= weekAgo) tokensThisWeek += (m.content.length / 4);
            });
        });

        const heatmapData = Object.entries(heatmap).map(([date, count]) => ({ date, count }));

        res.json({
            totalMessages,
            tokensToday: Math.round(tokensToday),
            tokensThisWeek: Math.round(tokensThisWeek),
            heatmap: heatmapData,
            threadsCount: threads.length
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
