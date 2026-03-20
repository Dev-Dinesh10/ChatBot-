import express            from 'express';
import multer             from 'multer';
import { v4 as uuidv4 }  from 'uuid';
import DocumentIndex      from '../models/DocumentIndex.js';
import { extractFromPDF, extractFromText, extractFromURL } from '../Utils/extracttext.js';
import { bm25Search }     from '../Utils/Bm25.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Multer — store files in memory (we extract text and discard the buffer)
const upload = multer({
    storage: multer.memoryStorage(),
    limits:  { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// ─────────────────────────────────────────────
// POST /api/rag/upload
// Upload and index a PDF, TXT, or MD file
// ─────────────────────────────────────────────
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'No file uploaded.' });

        const ext = file.originalname.split('.').pop().toLowerCase();
        let chunks, type;

        if (ext === 'pdf') {
            chunks = await extractFromPDF(file.buffer);
            type   = 'pdf';
        } else if (['txt', 'md', 'markdown'].includes(ext)) {
            chunks = extractFromText(file.buffer.toString('utf-8'));
            type   = 'text';
        } else {
            return res.status(400).json({ error: 'Unsupported type. Upload a PDF, TXT, or MD file.' });
        }

        if (chunks.length === 0)
            return res.status(422).json({ error: 'Could not extract any text from this file.' });

        const docId = uuidv4();
        await DocumentIndex.create({
            userId:     req.user._id,
            docId,
            filename:   file.originalname,
            type,
            chunks,
            totalPages: chunks.length,
        });

        res.status(201).json({ docId, filename: file.originalname, pages: chunks.length });
    } catch (err) {
        console.error('RAG upload error:', err);
        res.status(500).json({ error: 'Failed to process document.' });
    }
});

// ─────────────────────────────────────────────
// POST /api/rag/url
// Fetch and index a web page
// ─────────────────────────────────────────────
router.post('/url', authMiddleware, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required.' });

        try { new URL(url); } catch { return res.status(400).json({ error: 'Invalid URL.' }); }

        const { chunks, title } = await extractFromURL(url);

        if (chunks.length === 0)
            return res.status(422).json({ error: 'Could not extract any text from this URL.' });

        const docId = uuidv4();
        await DocumentIndex.create({
            userId:     req.user._id,
            docId,
            filename:   title,
            type:       'url',
            sourceUrl:  url,
            chunks,
            totalPages: chunks.length,
        });

        res.status(201).json({ docId, filename: title, pages: chunks.length });
    } catch (err) {
        console.error('RAG URL error:', err);
        res.status(500).json({ error: 'Failed to fetch or process URL.' });
    }
});

// ─────────────────────────────────────────────
// POST /api/rag/chat
// Ask a question about an indexed document
// Body: { docId, query, history?: [{role, content}] }
// ─────────────────────────────────────────────
router.post('/chat', authMiddleware, async (req, res) => {
    try {
        const { docId, query, history = [] } = req.body;
        if (!docId || !query)
            return res.status(400).json({ error: 'docId and query are required.' });

        const doc = await DocumentIndex.findOne({ docId, userId: req.user._id });
        if (!doc) return res.status(404).json({ error: 'Document not found.' });

        // BM25: retrieve top-5 most relevant chunks
        const topChunks = bm25Search(query, doc.chunks, 5);
        const contextChunks = topChunks.length > 0 ? topChunks : doc.chunks;

        const context = contextChunks
            .map(c => `[Page ${c.pageNum}]\n${c.text}`)
            .join('\n\n---\n\n');

        const systemPrompt =
`You are a precise document assistant. Answer questions using ONLY the context provided.
If the answer is not in the context, say "I couldn't find that in the document."
Always cite the page number (e.g. "According to page 3...") when referencing specific information.
Be concise and accurate.

Document: "${doc.filename}"

Relevant context:
${context}`;

        // Build message history (last 10 turns max)
        const recentHistory = history.slice(-10).map(h => ({
            role:    h.role === 'assistant' ? 'model' : 'user',
            parts:   [{ text: h.content }],
        }));

        // ── Groq API call (free) ──
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model:      'llama-3.3-70b-versatile',
                max_tokens: 1024,
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
                    { role: 'user', content: query },
                ],
            }),
        });

        const groqData = await response.json();

        if (!response.ok)
            throw new Error(groqData.error?.message || 'Groq API error');

        const answer      = groqData.choices[0].message.content;
        const sourcedPages = [...new Set(contextChunks.map(c => c.pageNum))].sort((a, b) => a - b);

        res.json({ answer, sourcedPages });
    } catch (err) {
        console.error('RAG chat error:', err);
        res.status(500).json({ error: 'Failed to generate a response.' });
    }
});

// ─────────────────────────────────────────────
// GET /api/rag/documents
// ─────────────────────────────────────────────
router.get('/documents', authMiddleware, async (req, res) => {
    try {
        const docs = await DocumentIndex
            .find({ userId: req.user._id })
            .select('docId filename type totalPages sourceUrl createdAt')
            .sort({ createdAt: -1 });

        res.json(docs);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch documents.' });
    }
});

// ─────────────────────────────────────────────
// DELETE /api/rag/documents/:docId
// ─────────────────────────────────────────────
router.delete('/documents/:docId', authMiddleware, async (req, res) => {
    try {
        const result = await DocumentIndex.deleteOne({
            docId:  req.params.docId,
            userId: req.user._id,
        });
        if (result.deletedCount === 0)
            return res.status(404).json({ error: 'Document not found.' });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete document.' });
    }
});

export default router;