import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  originalName: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  size: {
    type: Number,
    required: true,
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  columns: {
    type: [String],
    required: true,
  },
  rowCount: {
    type: Number,
    required: true,
  },
  sampleData: {
    type: [mongoose.Schema.Types.Mixed],
    required: true,
  },
});

export default mongoose.model('File', fileSchema);



