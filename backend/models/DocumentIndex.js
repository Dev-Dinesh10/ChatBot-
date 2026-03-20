import mongoose from 'mongoose';

const ChunkSchema = new mongoose.Schema({
    pageNum: { type: Number, default: 1 },
    text:    { type: String, required: true },
}, { _id: false });

const DocumentIndexSchema = new mongoose.Schema({
    userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    docId:      { type: String, required: true, unique: true },
    filename:   { type: String, required: true },
    type:       { type: String, enum: ['pdf', 'text', 'url'], required: true },
    sourceUrl:  { type: String },
    chunks:     [ChunkSchema],
    totalPages: { type: Number, default: 1 },
    createdAt:  { type: Date, default: Date.now },
});

// Index for fast user lookups
DocumentIndexSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('DocumentIndex', DocumentIndexSchema);