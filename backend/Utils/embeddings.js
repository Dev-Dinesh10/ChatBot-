import { pipeline } from '@xenova/transformers';

// ========================= MODEL SETUP =========================
let embedder = null;

async function getEmbedder() {
    if (!embedder) {
        console.log("Loading embedding model... (only happens once)");
        embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
        console.log("Embedding model ready!");
    }
    return embedder;
}

// ========================= CORE EMBEDDING =========================
export async function getEmbedding(text) {
    if (!text || !text.trim()) {
        throw new Error("Empty text for embedding");
    }

    const embed = await getEmbedder();
    const output = await embed(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
}

// ========================= BATCH EMBEDDINGS =========================
export async function getBatchEmbeddings(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
        throw new Error("Invalid batch input");
    }

    // Run sequentially to avoid memory spikes
    const embeddings = [];
    for (const text of texts) {
        const emb = await getEmbedding(text);
        embeddings.push(emb);
    }
    return embeddings;
}

// ========================= ALIASES =========================
export const getDocumentEmbedding = (text) => getEmbedding(text);
export const getQueryEmbedding = (text) => getEmbedding(text);

// ========================= SIMILARITY =========================
export function cosineSimilarity(vecA, vecB) {
    if (
        !Array.isArray(vecA) ||
        !Array.isArray(vecB) ||
        vecA.length === 0 ||
        vecB.length === 0 ||
        vecA.length !== vecB.length
    ) {
        return 0;
    }

    let dot = 0, magA = 0, magB = 0;

    for (let i = 0; i < vecA.length; i++) {
        const a = vecA[i] || 0;
        const b = vecB[i] || 0;
        dot += a * b;
        magA += a * a;
        magB += b * b;
    }

    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);

    if (magA === 0 || magB === 0) return 0;

    return dot / (magA * magB);
}

// ========================= RETRIEVAL =========================
export async function findRelevantChunks(queryText, allChunks, topK = 3) {
    try {
        const queryEmbedding = await getQueryEmbedding(queryText);

        if (!queryEmbedding) return [];

        const validChunks = (allChunks || []).filter(
            chunk =>
                chunk &&
                Array.isArray(chunk.embedding) &&
                chunk.embedding.length > 0
        );

        if (validChunks.length === 0) {
            console.warn("No valid chunks found");
            return [];
        }

        return validChunks
            .map(chunk => ({
                text: chunk.text,
                pageNum: chunk.pageNum,
                score: cosineSimilarity(queryEmbedding, chunk.embedding),
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);

    } catch (err) {
        console.error("findRelevantChunks ERROR:", err.message);
        return [];
    }
}