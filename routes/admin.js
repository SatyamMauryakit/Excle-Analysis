import express from 'express';
import User from '../models/User.js';
import File from '../models/File.js';
import Analysis from '../models/Analysis.js';
import { verifyToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin role
router.use(verifyToken);
router.use(isAdmin);

/**
 * GET /api/admin/users
 * Get list of all users (admin only)
 */
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find()
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/usage
 * Get basic usage statistics (admin only)
 */
router.get('/usage', async (req, res, next) => {
  try {
    const totalFiles = await File.countDocuments();
    const totalAnalyses = await Analysis.countDocuments();
    const totalUsers = await User.countDocuments();

    // Get files per user
    const filesPerUser = await File.aggregate([
      {
        $group: {
          _id: '$owner',
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $project: {
          userId: '$_id',
          userName: '$user.name',
          userEmail: '$user.email',
          fileCount: '$count',
        },
      },
    ]);

    res.json({
      totalFiles,
      totalAnalyses,
      totalUsers,
      filesPerUser,
    });
  } catch (error) {
    next(error);
  }
});

export default router;



