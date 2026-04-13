import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
    text:        { type: String, required: true },
    pageNum:     { type: Number, default: 1 },
    chunkIndex:  { type: Number, default: 0 },
    embedding:   { type: [Number], required: true },

    // 🔥 ADD THESE
    docId:       { type: String, required: true },
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

}, { _id: false });

const documentIndexSchema = new mongoose.Schema({
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    docId:       { type: String, required: true, unique: true },
    filename:    { type: String, required: true },
    type:        { type: String, enum: ['pdf', 'txt', 'url'], default: 'pdf' },
    totalPages:  { type: Number, default: 1 },

    chunks:      [chunkSchema],

    createdAt:   { type: Date, default: Date.now },
});

export default mongoose.model('DocumentIndex', documentIndexSchema);