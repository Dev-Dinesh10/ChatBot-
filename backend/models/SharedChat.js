import mongoose from 'mongoose';

const SharedChatSchema = new mongoose.Schema({
    uuid: { type: String, required: true, unique: true },
    title: { type: String },
    messages: [{
        role: { type: String },
        content: { type: String },
        timestamp: { type: Date }
    }],
    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    },
    createdAt: { type: Date, default: Date.now },
});

// Auto-delete after expiry
SharedChatSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('SharedChat', SharedChatSchema);
