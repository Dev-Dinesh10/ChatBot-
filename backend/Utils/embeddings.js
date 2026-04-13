const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const VOYAGE_URL = 'https://api.voyageai.com/v1/embeddings';

// 🔹 Base embedding function (reusable)
async function getEmbedding(text, type = "document") {
    const response = await fetch(VOYAGE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${VOYAGE_API_KEY}`,
        },
        body: JSON.stringify({
            input: [text],
            model: 'voyage-3',
            input_type: type, // 🔥 FIXED
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Voyage API error: ${err}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
}

// ✅ For document chunks (upload phase)
export async function getDocumentEmbedding(text) {
    return getEmbedding(text, "document");
}

// ✅ For user queries (MOST IMPORTANT FIX)
export async function getQueryEmbedding(text) {
    return getEmbedding(text, "query");
}

// Cosine similarity
export function cosineSimilarity(vecA, vecB) {
    const dot = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
}

// 🔹 Retrieval function (FIXED to use query embedding)
export async function findRelevantChunks(queryText, allDocs, topK = 3) {
    const queryEmbedding = await getQueryEmbedding(queryText); // 🔥 FIXED

    const scored = allDocs.map((doc) => ({
        text: doc.text,
        pageNum: doc.pageNum,
        score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}