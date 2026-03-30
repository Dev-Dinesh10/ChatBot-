import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
    text:      { type: String, required: true },  // raw chunk text
    pageNum:   { type: Number, default: 1 },       // page number
    chunkIndex:{ type: Number, default: 0 },       // position in doc
    embedding: { type: [Number], required: true }, // 🆕 vector array
}, { _id: false });

const documentIndexSchema = new mongoose.Schema({
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    docId:       { type: String, required: true, unique: true }, // UUID
    filename:    { type: String, required: true },
    type:        { type: String, enum: ['pdf', 'txt', 'url'], default: 'pdf' },
    totalPages:  { type: Number, default: 1 },
    chunks:      [chunkSchema],                    // all embedded chunks
    createdAt:   { type: Date, default: Date.now },
});

export default mongoose.model('DocumentIndex', documentIndexSchema);