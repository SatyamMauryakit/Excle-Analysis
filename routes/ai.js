import express from 'express';
import File from '../models/File.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

/**
 * POST /api/ai/insights/:fileId
 * Generate AI insights about the uploaded data
 * Uses OpenAI API if OPENAI_API_KEY is set, otherwise returns mock response
 */
router.post('/insights/:fileId', async (req, res, next) => {
  try {
    const file = await File.findById(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user owns the file or is admin
    if (file.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Prepare data summary for AI
    const dataSummary = {
      fileName: file.originalName,
      columns: file.columns,
      rowCount: file.rowCount,
      sampleData: file.sampleData.slice(0, 5), // First 5 rows as sample
    };

    // If OpenAI API key is set, call OpenAI
    if (process.env.OPENAI_API_KEY) {
      try {
        const prompt = `Analyze this Excel data and provide insights:
        
File: ${dataSummary.fileName}
Columns: ${dataSummary.columns.join(', ')}
Total Rows: ${dataSummary.rowCount}
Sample Data: ${JSON.stringify(dataSummary.sampleData, null, 2)}

Provide a brief analysis (2-3 paragraphs) about:
1. What type of data this appears to be
2. Key patterns or observations
3. Potential use cases for visualization`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'You are a data analyst that provides concise insights about Excel data.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            max_tokens: 300,
          }),
        });

        if (!response.ok) {
          throw new Error('OpenAI API request failed');
        }

        const data = await response.json();
        const insights = data.choices[0].message.content;

        res.json({
          insights,
          source: 'openai',
        });
      } catch (error) {
        console.error('OpenAI API error:', error);
        // Fall back to mock response if API fails
        res.json({
          insights: generateMockInsights(dataSummary),
          source: 'mock (OpenAI API error)',
        });
      }
    } else {
      // Return mock response if no API key
      res.json({
        insights: generateMockInsights(dataSummary),
        source: 'mock (no API key configured)',
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * Generate mock insights when OpenAI is not available
 */
function generateMockInsights(dataSummary) {
  return `This dataset contains ${dataSummary.rowCount} rows with ${dataSummary.columns.length} columns: ${dataSummary.columns.join(', ')}.

Based on the column names and sample data, this appears to be a structured dataset that could benefit from various types of visualizations. Consider using bar charts for categorical comparisons, line charts for trends over time, or scatter plots to identify correlations between numeric variables.

To get AI-powered insights, configure the OPENAI_API_KEY environment variable in the backend.`;
}

export default router;



