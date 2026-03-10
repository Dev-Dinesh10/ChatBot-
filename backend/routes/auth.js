import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const router = express.Router();

// Helper: generate a signed JWT for a user
const signToken = (user) =>
    jwt.sign(
        { id: user._id, email: user.email, name: user.name, sub: user._id.toString() },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

// ────────────────────────────────────
// POST /api/auth/register
// Creates a new user account
// ────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // 1. Basic validation
        if (!name || !email || !password)
            return res.status(400).json({ error: 'Name, email and password are required.' });

        if (password.length < 6)
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });

        // 2. Check if email already registered
        const existing = await User.findOne({ email });
        if (existing)
            return res.status(409).json({ error: 'An account with this email already exists.' });

        // 3. Hash password with bcrypt (salt rounds = 10)
        const hashed = await bcrypt.hash(password, 10);

        // 4. Save user to MongoDB
        const user = await User.create({ name, email, password: hashed });

        // 5. Return a signed JWT so user is instantly logged in
        const token = signToken(user);
        res.status(201).json({
            token,
            user: { id: user._id, name: user.name, email: user.email },
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// ────────────────────────────────────
// POST /api/auth/login
// Authenticates an existing user
// ────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Basic validation
        if (!email || !password)
            return res.status(400).json({ error: 'Email and password are required.' });

        // 2. Find user by email
        const user = await User.findOne({ email });
        if (!user)
            return res.status(401).json({ error: 'No account found with this email.' });

        // 3. Compare provided password against stored hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch)
            return res.status(401).json({ error: 'Incorrect password.' });

        // 4. Return a signed JWT
        const token = signToken(user);
        res.json({
            token,
            user: { id: user._id, name: user.name, email: user.email },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// ────────────────────────────────────
// POST /api/auth/guest  (kept for dev fallback)
// ────────────────────────────────────
router.post('/guest', async (req, res) => {
    try {
        const { name = 'Guest', email = 'guest@klausai.dev' } = req.body;
        let user = await User.findOne({ email });
        if (!user) {
            const hashed = await bcrypt.hash('guestpassword', 10);
            user = await User.create({ email, name, password: hashed });
        }
        const token = signToken(user);
        res.json({ token, user: { name: user.name, email: user.email, id: user._id } });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
