const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const VOYAGE_URL     = 'https://api.voyageai.com/v1/embeddings';

// Convert text into a vector embedding (using fetch directly)
export async function getEmbedding(text) {
    const response = await fetch(VOYAGE_URL, {
        method:  'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${VOYAGE_API_KEY}`,
        },
        body: JSON.stringify({
            input:      [text],
            model:      'voyage-3',
            input_type: 'document',
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Voyage API error: ${err}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
}

// Cosine similarity between two vectors (0 = different, 1 = identical)
export function cosineSimilarity(vecA, vecB) {
    const dot  = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const magB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
}

// Find top K most relevant chunks to the query
export async function findRelevantChunks(queryText, allDocs, topK = 3) {
    const queryEmbedding = await getEmbedding(queryText);

    const scored = allDocs.map((doc) => ({
        text:    doc.text,
        pageNum: doc.pageNum,
        score:   cosineSimilarity(queryEmbedding, doc.embedding),
    }));

    return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
}