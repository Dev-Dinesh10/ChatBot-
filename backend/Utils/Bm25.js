// ─────────────────────────────────────────────
// BM25 Retrieval  (Okapi BM25)
// k1 = 1.5  (term-frequency saturation)
// b  = 0.75 (length normalisation)
// ─────────────────────────────────────────────

const k1 = 1.5;
const b  = 0.75;

// Simple but effective tokenizer — lowercases, strips punctuation, drops stop words
const STOP_WORDS = new Set([
    'the','a','an','and','or','but','in','on','at','to','for','of','with',
    'is','are','was','were','be','been','being','have','has','had','do','does',
    'did','will','would','could','should','may','might','this','that','these',
    'those','it','its','as','by','from','not','what','which','who','how',
]);

function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length > 2 && !STOP_WORDS.has(t));
}

/**
 * Run BM25 over an array of chunks and return the top-K results.
 * @param {string}   query
 * @param {Array<{pageNum: number, text: string}>} chunks
 * @param {number}   topK   — how many chunks to return (default 5)
 * @returns {Array<{pageNum, text, score}>}
 */
export function bm25Search(query, chunks, topK = 5) {
    if (!chunks || chunks.length === 0) return [];

    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) return chunks.slice(0, topK).map(c => ({ ...c, score: 0 }));

    const N = chunks.length;

    // Pre-compute token frequencies and lengths for every chunk
    const tokenized = chunks.map(chunk => {
        const tokens = tokenize(chunk.text);
        const tf = {};
        tokens.forEach(t => { tf[t] = (tf[t] || 0) + 1; });
        return { tf, len: tokens.length };
    });

    // Average chunk length
    const avgLen = tokenized.reduce((sum, c) => sum + c.len, 0) / N;

    // Document frequency (# of chunks containing each query term)
    const df = {};
    queryTerms.forEach(term => {
        df[term] = tokenized.filter(c => (c.tf[term] || 0) > 0).length;
    });

    // Score each chunk
    const scored = chunks.map((chunk, i) => {
        let score = 0;
        queryTerms.forEach(term => {
            const f = tokenized[i].tf[term] || 0;
            if (f === 0) return;
            const idf      = Math.log((N - df[term] + 0.5) / (df[term] + 0.5) + 1);
            const tfScore  = (f * (k1 + 1)) / (f + k1 * (1 - b + b * tokenized[i].len / avgLen));
            score += idf * tfScore;
        });
        return { ...chunk, score };
    });

    return scored
        .filter(c => c.score > 0)
        .sort((a, b_) => b_.score - a.score)
        .slice(0, topK);
}