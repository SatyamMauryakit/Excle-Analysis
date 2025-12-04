import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import File from '../models/File.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only Excel files
    if (
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.originalname.endsWith('.xls') ||
      file.originalname.endsWith('.xlsx')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xls, .xlsx) are allowed'), false);
    }
  },
});

/**
 * POST /api/files/upload
 * Upload and parse Excel file
 * Protected route - requires JWT token
 */
router.post('/upload', verifyToken, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse Excel file from buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert to JSON array
    const data = xlsx.utils.sheet_to_json(worksheet, { raw: false });

    if (data.length === 0) {
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Extract column names from first row
    const columns = Object.keys(data[0]);

    // Get sample data (first 100 rows for preview and charting)
    // Store more data to allow charting without re-upload
    const sampleData = data.slice(0, 100).map(row => {
      const sampleRow = {};
      columns.forEach(col => {
        sampleRow[col] = row[col];
      });
      return sampleRow;
    });

    // Save file metadata to database
    const fileDoc = new File({
      owner: req.user._id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      columns,
      rowCount: data.length,
      sampleData,
    });

    await fileDoc.save();

    // Return file document with full data for charting
    // In production, you might want to store the full data separately
    // For now, we'll parse it again when needed or store it
    res.status(201).json({
      id: fileDoc._id,
      originalName: fileDoc.originalName,
      uploadedAt: fileDoc.uploadedAt,
      columns: fileDoc.columns,
      rowCount: fileDoc.rowCount,
      sampleData: fileDoc.sampleData,
      // Include full data for immediate use (in production, consider pagination)
      fullData: data,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/files/history
 * Get upload history for current user
 * Protected route - requires JWT token
 */
router.get('/history', verifyToken, async (req, res, next) => {
  try {
    const files = await File.find({ owner: req.user._id })
      .sort({ uploadedAt: -1 })
      .select('-sampleData'); // Exclude sampleData to reduce payload

    res.json(files);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/files/:fileId
 * Get file details and full data
 * Protected route - user can only access their own files (or admin)
 */
router.get('/:fileId', verifyToken, async (req, res, next) => {
  try {
    const file = await File.findById(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user owns the file or is admin
    if (file.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Return file with sampleData (first 100 rows stored)
    // For files with more than 100 rows, charts will use the sample data
    // In production, consider storing full data in a separate collection or file storage
    res.json({
      id: file._id,
      originalName: file.originalName,
      uploadedAt: file.uploadedAt,
      columns: file.columns,
      rowCount: file.rowCount,
      sampleData: file.sampleData,
      // Use sampleData as fullData for charting (limited to 100 rows)
      fullData: file.sampleData,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/files/:fileId
 * Delete a file
 * Protected route - user can only delete their own files (or admin)
 */
router.delete('/:fileId', verifyToken, async (req, res, next) => {
  try {
    const file = await File.findById(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user owns the file or is admin
    if (file.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete the file
    await File.findByIdAndDelete(req.params.fileId);

    res.json({ message: 'File deleted successfully', id: req.params.fileId });
  } catch (error) {
    next(error);
  }
});

export default router;

