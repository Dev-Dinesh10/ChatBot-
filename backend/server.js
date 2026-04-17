import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import './config/dbconnection.js';
import chatRoutes from './routes/chat.js';
import analyticsRoutes from './routes/analytics.js';
import exportRoutes from './routes/export.js';
import authRoutes from './routes/auth.js';
import ragRoutes from './routes/Rag.js';

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express.json());


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/rag', ragRoutes);

// Health Check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
