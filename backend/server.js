import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { OpenRouter } from '@openrouter/sdk';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const openrouter = new OpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY || ''
});

// Change this to any working free model from openrouter.ai/models
const MODEL = 'google/gemma-3-4b-it:free';

app.post('/api/chat', async (req, res) => {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages array is required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
        const stream = await openrouter.chat.send({
            chatGenerationParams: {
                model: MODEL,
                messages,
                stream: true
            }
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                res.write('data: ' + JSON.stringify({ content }) + '\n\n');
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        console.error('OpenRouter API error:', error);
        res.write('data: ' + JSON.stringify({ error: error.message }) + '\n\n');
        res.end();
    }
});

app.listen(port, () => {
    console.log('Server is running on http://localhost:' + port);
});
