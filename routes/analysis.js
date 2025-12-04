import express from 'express';
import Analysis from '../models/Analysis.js';
import File from '../models/File.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * POST /api/analysis
 * Create a new analysis configuration
 * Body: { fileId, xAxis, yAxis, chartType, options? }
 */
router.post('/', async (req, res, next) => {
  try {
    const { fileId, xAxis, yAxis, chartType, options } = req.body;

    if (!fileId || !xAxis || !yAxis || !chartType) {
      return res.status(400).json({ error: 'fileId, xAxis, yAxis, and chartType are required' });
    }

    // Validate chart type
    const validChartTypes = ['bar', 'line', 'pie', 'scatter', '3d-bar'];
    if (!validChartTypes.includes(chartType)) {
      return res.status(400).json({ error: 'Invalid chart type' });
    }

    // Verify file exists and belongs to user (or user is admin)
    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verify columns exist in file
    if (!file.columns.includes(xAxis) || !file.columns.includes(yAxis)) {
      return res.status(400).json({ error: 'Selected axes must exist in file columns' });
    }

    // Create analysis
    const analysis = new Analysis({
      fileId,
      userId: req.user._id,
      xAxis,
      yAxis,
      chartType,
      options: options || {},
    });

    await analysis.save();

    res.status(201).json(analysis);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/analysis/:fileId
 * Get all analyses for a specific file
 */
router.get('/:fileId', async (req, res, next) => {
  try {
    // Verify file exists and belongs to user
    const file = await File.findById(req.params.fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get all analyses for this file
    const analyses = await Analysis.find({ fileId: req.params.fileId })
      .sort({ createdAt: -1 });

    res.json(analyses);
  } catch (error) {
    next(error);
  }
});

export default router;



