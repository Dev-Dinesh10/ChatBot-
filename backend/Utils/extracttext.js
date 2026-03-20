import { extractText } from 'unpdf';
import axios    from 'axios';
import * as cheerio from 'cheerio';

// ─────────────────────────────────────
// Internal: chunk a long string into
// ~500-word segments, each with a page number
// ─────────────────────────────────────
function chunkText(text, startPage = 1) {
    // Split on blank lines to preserve paragraph structure
    const paragraphs = text
        .split(/\n{2,}/)
        .map(p => p.replace(/\s+/g, ' ').trim())
        .filter(p => p.length > 40);

    const chunks   = [];
    let current    = '';
    let wordCount  = 0;
    let pageNum    = startPage;

    for (const para of paragraphs) {
        const words = para.split(/\s+/).length;
        if (wordCount + words > 500 && current) {
            chunks.push({ pageNum, text: current.trim() });
            current   = para;
            wordCount = words;
            pageNum++;
        } else {
            current   += (current ? '\n\n' : '') + para;
            wordCount += words;
        }
    }

    if (current.trim()) chunks.push({ pageNum, text: current.trim() });

    // Fallback if no paragraph breaks were found
    if (chunks.length === 0 && text.trim().length > 0) {
        const words = text.split(/\s+/);
        let i = 0, page = startPage;
        while (i < words.length) {
            chunks.push({ pageNum: page++, text: words.slice(i, i + 500).join(' ') });
            i += 500;
        }
    }

    return chunks;
}

// ─────────────────────────────────────
// PDF  (uses unpdf — ESM native)
// ─────────────────────────────────────
export async function extractFromPDF(buffer) {
    // unpdf expects a Uint8Array
    const uint8 = new Uint8Array(buffer);
    const { totalPages, text } = await extractText(uint8, { mergePages: false });

    // text is an array of strings, one per page
    if (Array.isArray(text) && text.length > 0) {
        return text
            .map((t, i) => ({ pageNum: i + 1, text: t.trim() }))
            .filter(c => c.text.length > 30);
    }

    // Fallback: if text is a single string, chunk it
    const fullText = Array.isArray(text) ? text.join('\n\n') : String(text);
    return chunkText(fullText);
}

// ─────────────────────────────────────
// Plain text / Markdown
// ─────────────────────────────────────
export function extractFromText(text) {
    return chunkText(text);
}

// ─────────────────────────────────────
// Web URL  (via cheerio)
// ─────────────────────────────────────
export async function extractFromURL(url) {
    const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KlausAI-RAG/1.0)' },
        timeout: 15000,
        maxContentLength: 5 * 1024 * 1024, // 5 MB cap
    });

    const $ = cheerio.load(response.data);

    // Strip noise
    $('script, style, nav, footer, header, aside, [role="navigation"], [role="banner"], .nav, .footer, .header, .sidebar, .menu, .ad, .advertisement').remove();

    // Page title for display
    const title =
        $('meta[property="og:title"]').attr('content') ||
        $('title').text().trim() ||
        $('h1').first().text().trim() ||
        url;

    // Prefer semantic content containers
    const container = $('article, main, [role="main"], .content, .post, #content, #main').first();
    const rawText   = (container.length ? container : $('body')).text();

    const cleanText = rawText.replace(/\s{3,}/g, '\n\n').trim();
    const chunks    = chunkText(cleanText);

    return { chunks, title: title.slice(0, 200) };
}