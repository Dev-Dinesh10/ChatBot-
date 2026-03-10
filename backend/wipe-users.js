import 'dotenv/config';
import mongoose from 'mongoose';

async function wipeUsers() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB.');

        // Drop the entire users collection to completely wipe all old ghosts/indexes
        try {
            await mongoose.connection.db.dropCollection('users');
            console.log('✅ Dropped the entire users collection!');
        } catch (e) {
            if (e.message.indexOf('ns not found') !== -1) {
                console.log('✅ Users collection already dropped/missing.');
            } else {
                throw e;
            }
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
}

wipeUsers();
