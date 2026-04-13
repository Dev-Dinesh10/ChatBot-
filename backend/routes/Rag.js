import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware as protect } from '../middleware/auth.js';
import { extractFromPDF, extractFromText, extractFromURL } from '../Utils/Extracttext.js';
import { getBatchEmbeddings, findRelevantChunks } from '../Utils/embeddings.js';
import DocumentIndex from '../models/DocumentIndex.js';
import Groq from 'groq-sdk';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/* ========================= UPLOAD ========================= */
router.post('/upload', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

        const filename = req.file.originalname;
        const ext = filename.split('.').pop().toLowerCase();

        let pageChunks = [];

        if (ext === 'pdf') {
            pageChunks = await extractFromPDF(req.file.buffer);
        } else {
            const text = req.file.buffer.toString('utf-8');
            pageChunks = extractFromText(text);
        }

        const docId = uuidv4();

        const texts = pageChunks.map(chunk => chunk.text);
        const embeddings = await getBatchEmbeddings(texts, "document");

        const embeddedChunks = pageChunks.map((chunk, index) => ({
            text: chunk.text,
            pageNum: chunk.pageNum,
            chunkIndex: index,
            embedding: embeddings[index],
            docId,
            userId: req.user._id,
        }));

        const doc = await DocumentIndex.create({
            userId: req.user._id,
            docId,
            filename,
            totalPages: 1,
            chunks: embeddedChunks,
        });

        res.json({ docId: doc.docId, filename });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

/* ========================= DOCUMENT LIST ========================= */
router.get('/documents', protect, async (req, res) => {
    try {
        const docs = await DocumentIndex.find(
            { userId: req.user._id },
            { chunks: 0 }
        ).sort({ createdAt: -1 });

        res.json(docs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ========================= SINGLE DOC CHAT ========================= */
router.post('/chat', protect, async (req, res) => {
    try {
        const { docId, query } = req.body;

        const doc = await DocumentIndex.findOne({ docId, userId: req.user._id });
        if (!doc) return res.status(404).json({ error: 'Document not found' });

        const topChunks = await findRelevantChunks(query, doc.chunks, 3);
        const context = topChunks.map(c => c.text).join("\n\n");

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `Answer ONLY using context. Return one precise answer. If not found say "Not found".

Context:
${context}`
                },
                { role: 'user', content: query }
            ],
            temperature: 0.2
        });

        res.json({
            answer: completion.choices[0].message.content,
            context: topChunks.map(c => c.text)
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ========================= CHAT ALL (FIXED SAFE VERSION) ========================= */
router.post('/chat-all', protect, async (req, res) => {
    try {
        const { query } = req.body;

        const allDocs = await DocumentIndex.find({ userId: req.user._id });

       const scoredDocs = await Promise.all(
    allDocs.map(async (doc) => {
        try {
            const topChunks = await findRelevantChunks(query, doc.chunks, 3);

            const avgScore =
                topChunks.length > 0
                    ? topChunks.reduce((sum, c) => sum + c.score, 0) / topChunks.length
                    : 0;

            return {
                doc,
                score: avgScore,
            };
        } catch (err) {
            return {
                doc,
                score: 0,
            };
        }
    })
);

        const validDocs = scoredDocs.filter(d => d.score > 0);

        if (!validDocs.length) {
            return res.json({
                answer: "Not found",
                context: []
            });
        }

        const bestDoc = validDocs.sort((a, b) => b.score - a.score)[0].doc;

        if (!bestDoc) {
            return res.json({
                answer: "Not found",
                context: []
            });
        }

        const topChunks = await findRelevantChunks(query, bestDoc.chunks, 3);
        const context = topChunks.map(c => c.text).join("\n\n");

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `Answer ONLY using context. Return ONE answer. Do not list multiple names.

Context:
${context}`
                },
                { role: 'user', content: query }
            ],
            temperature: 0.2
        });

        res.json({
            answer: completion.choices[0].message.content,
            context: topChunks.map(c => c.text)
        });

    } catch (err) {
        console.error("CHAT-ALL ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

/* ========================= DELETE ========================= */
router.delete('/documents/:docId', protect, async (req, res) => {
    try {
        await DocumentIndex.findOneAndDelete({
            docId: req.params.docId,
            userId: req.user._id
        });

        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;