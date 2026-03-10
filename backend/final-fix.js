import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function runFix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        // Explicitly drop by collection name
        await mongoose.connection.collection('users').dropIndex('googleId_1');
        console.log('✅ Dropped googleId_1 index successfully.');

        process.exit(0);
    } catch (err) {
        if (err.message.includes('not found')) {
            console.log('✅ Index already removed or not found.');
        } else {
            console.error('❌ Error:', err.message);
        }
        process.exit(0);
    }
}

runFix();
