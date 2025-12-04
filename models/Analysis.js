import mongoose from 'mongoose';

const analysisSchema = new mongoose.Schema({
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'File',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  xAxis: {
    type: String,
    required: true,
  },
  yAxis: {
    type: String,
    required: true,
  },
  chartType: {
    type: String,
    required: true,
    enum: ['bar', 'line', 'pie', 'scatter', '3d-bar'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  options: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
});

export default mongoose.model('Analysis', analysisSchema);



