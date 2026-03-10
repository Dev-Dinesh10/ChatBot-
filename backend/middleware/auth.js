import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        // Verify and decode the JWT
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Look up the user from the database using the ID from the token
        const user = await User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        req.user = user; // attach user to request object
        next();
    } catch (error) {
        console.error('Auth Error:', error.message);
        res.status(401).json({ error: 'Unauthorized – invalid or expired token' });
    }
};
