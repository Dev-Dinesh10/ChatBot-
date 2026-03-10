import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // stored as bcrypt hash
    image: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
}, { autoIndex: false }); // Stop Mongoose from recreating old indexes

export default mongoose.model('User', UserSchema);
