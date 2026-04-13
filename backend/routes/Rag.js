import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware as protect } from '../middleware/auth.js';
import { extractFromPDF, extractFromText, extractFromURL } from '../Utils/Extracttext.js';
import { getEmbedding, findRelevantChunks } from '../Utils/embeddings.js';
import DocumentIndex from '../models/DocumentIndex.js';
import Groq from 'groq-sdk';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── UPLOAD FILE ──────────────────────────────────────────────────────────────
router.post('/upload', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

        const filename = req.file.originalname;
        const ext      = filename.split('.').pop().toLowerCase();
        const allowed  = ['pdf', 'txt', 'md', 'markdown'];

        if (!allowed.includes(ext)) {
            return res.status(400).json({ error: 'Only PDF, TXT, and MD files are supported.' });
        }

        let pageChunks = [];
        if (ext === 'pdf') {
            pageChunks = await extractFromPDF(req.file.buffer);
        } else {
            const text = req.file.buffer.toString('utf-8');
            pageChunks = extractFromText(text);
        }

        if (!pageChunks.length) {
            return res.status(400).json({ error: 'Could not extract text from file.' });
        }

        const embeddedChunks = await Promise.all(
            pageChunks.map(async (chunk, index) => ({
                text:       chunk.text,
                pageNum:    chunk.pageNum,
                chunkIndex: index,
                embedding:  await getEmbedding(chunk.text),
            }))
        );

        const doc = await DocumentIndex.create({
            userId:     req.user._id,
            docId:      uuidv4(),
            filename,
            type:       ext === 'pdf' ? 'pdf' : 'txt',
            totalPages: Math.max(...pageChunks.map(c => c.pageNum)),
            chunks:     embeddedChunks,
        });

        res.json({ 
            filename: doc.filename, 
            pages:    doc.totalPages,
            docId:    doc.docId,
        });

    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── INDEX URL ────────────────────────────────────────────────────────────────
router.post('/url', protect, async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required.' });

        const { chunks: pageChunks, title: filename } = await extractFromURL(url);

        if (!pageChunks.length) {
            return res.status(400).json({ error: 'Could not extract text from URL.' });
        }

        const embeddedChunks = await Promise.all(
            pageChunks.map(async (chunk, index) => ({
                text:       chunk.text,
                pageNum:    chunk.pageNum,
                chunkIndex: index,
                embedding:  await getEmbedding(chunk.text),
            }))
        );

        const doc = await DocumentIndex.create({
            userId:     req.user._id,
            docId:      uuidv4(),
            filename,
            type:       'url',
            totalPages: 1,
            chunks:     embeddedChunks,
        });

        res.json({ filename: doc.filename, docId: doc.docId });

    } catch (err) {
        console.error('URL index error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET ALL DOCUMENTS ────────────────────────────────────────────────────────
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

// ─── CHAT WITH DOCUMENT ───────────────────────────────────────────────────────
router.post('/chat', protect, async (req, res) => {
    try {
        const { docId, query, history = [] } = req.body;
        if (!docId || !query) {
            return res.status(400).json({ error: 'docId and query are required.' });
        }

        const doc = await DocumentIndex.findOne({ docId, userId: req.user._id });
        if (!doc) return res.status(404).json({ error: 'Document not found.' });

        const topChunks = await findRelevantChunks(query, doc.chunks, 3);

        const context = topChunks
            .map((c, i) => `[Source ${i + 1} — Page ${c.pageNum}]:\n${c.text}`)
            .join('\n\n');

        const chatHistory = history.slice(-6).map(m => ({
            role:    m.role,
            content: m.content,
        }));

        const completion = await groq.chat.completions.create({
            model:    'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are a helpful assistant. Answer the question using ONLY the provided context below.

IMPORTANT FORMATTING RULES:
- Provide your answer in a clear, concise bullet-point list.
- Use bullet points for each relevant piece of information found in the context.
- Summarize the key points using bullet points ONLY.
- Avoid using long paragraphs.
- Keep answers highly structured and readable.
- If the answer is not in the context, say: "I don't have enough information in this document to answer that."

Context:
${context}`,
                },
                ...chatHistory,
                { role: 'user', content: query },
            ],
            max_tokens:  1024,
            temperature: 0.3,
        });

        const answer         = completion.choices[0].message.content;
        const sourcedPages   = [...new Set(topChunks.map(c => c.pageNum))];
        const contextChunks  = topChunks.map(c => c.text);

        res.json({ answer, sourcedPages, context: contextChunks });

    } catch (err) {
        console.error('Chat error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── CHAT ACROSS ALL DOCUMENTS ────────────────────────────────────────────────
router.post('/chat-all', protect, async (req, res) => {
    try {
        const { query, history = [] } = req.body;
        if (!query) return res.status(400).json({ error: 'query is required.' });

        const allDocs = await DocumentIndex.find({ userId: req.user._id });
        if (!allDocs.length) return res.status(404).json({ error: 'No documents found.' });

        const allChunks = allDocs.flatMap(doc => doc.chunks);
        const topChunks = await findRelevantChunks(query, allChunks, 3);

        const context = topChunks
            .map((c, i) => `[Source ${i + 1} — Page ${c.pageNum}]:\n${c.text}`)
            .join('\n\n');

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are a helpful assistant. Answer using ONLY requested context below.

IMPORTANT FORMATTING RULES:
- Provide your answer in a clear and concise bullet-point list.
- Do NOT use paragraphs for the answer.
- Keep the response highly structured.

Context:
${context}`,
                },
                ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
                { role: 'user', content: query },
            ],
            max_tokens:  1024,
            temperature: 0.3,
        });

        const answer        = completion.choices[0].message.content;
        const sourcedPages  = [...new Set(topChunks.map(c => c.pageNum))];
        const contextChunks = topChunks.map(c => c.text);

        res.json({ answer, sourcedPages, context: contextChunks });

    } catch (err) {
        console.error('Chat-all error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ─── DELETE DOCUMENT ──────────────────────────────────────────────────────────
router.delete('/documents/:docId', protect, async (req, res) => {
    try {
        await DocumentIndex.findOneAndDelete({ 
            docId:  req.params.docId, 
            userId: req.user._id 
        });
        res.json({ message: 'Document deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;