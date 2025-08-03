import { Router, Request, Response } from 'express';
import Replicate from 'replicate';
import fs from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Test replicate client
console.log('Replicate client auth property:', (replicate as any).auth);

interface SwapRequest {
  sourceImageData: string;
  targetGifUrl: string;
}

// URL validation helper
const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
};

// Async swap endpoint - returns prediction ID immediately
router.post('/swap', async (req: Request<{}, {}, SwapRequest>, res: Response) => {
  try {
    const { sourceImageData, targetGifUrl } = req.body;

    // Validate required fields
    if (!sourceImageData || !targetGifUrl) {
      console.error('Missing required fields:', { sourceImageData: !!sourceImageData, targetGifUrl: !!targetGifUrl });
      return res.status(400).json({ error: 'Missing required fields: sourceImageData and targetGifUrl are required' });
    }

    // Validate source image data (should be base64 data URL)
    if (!sourceImageData.startsWith('data:image/')) {
      console.error('Invalid source image data format:', sourceImageData.substring(0, 50) + '...');
      return res.status(400).json({ error: 'Invalid source image data format' });
    }

    if (!isValidUrl(targetGifUrl)) {
      console.error('Invalid target GIF URL:', targetGifUrl);
      return res.status(400).json({ error: 'Invalid target GIF URL' });
    }

    // Validate API token
    if (!process.env.REPLICATE_API_TOKEN) {
      console.error('REPLICATE_API_TOKEN not configured');
      return res.status(500).json({ error: 'API configuration error' });
    }

    console.log('=== FACE SWAP DEBUG START ===');
    console.log('Starting face swap with base64 source and target GIF:', { 
      sourceImageDataLength: sourceImageData.length, 
      targetGifUrl 
    });
    console.log('API Token present:', !!process.env.REPLICATE_API_TOKEN);
    console.log('API Token length:', process.env.REPLICATE_API_TOKEN?.length);
    console.log('API Token preview:', process.env.REPLICATE_API_TOKEN?.substring(0, 8) + '...');
    console.log('API Token full (for debugging):', process.env.REPLICATE_API_TOKEN);

    console.log('Testing target URL accessibility...');
    try {
      const targetTest = await fetch(targetGifUrl, { method: 'HEAD' });
      console.log('Target URL status:', targetTest.status, targetTest.statusText);
    } catch (error) {
      console.error('Target URL failed:', error.message);
    }

    // Create prediction with timing
    const startTime = Date.now();
    console.log('Creating Replicate prediction at:', new Date().toISOString());
    
    const prediction = await replicate.predictions.create({
      model: "zetyquickly-org/faceswap-a-gif",
      version: "974be35318aab27d78c8c935761e665620236d3b157a9b35385c7905c601d977",
      input: {
        source: sourceImageData,
        target: targetGifUrl
      }
    });

    const createTime = Date.now() - startTime;
    console.log('Prediction created in', createTime, 'ms');
    console.log('Prediction details:', JSON.stringify(prediction, null, 2));

    // Return prediction ID immediately for async processing
    res.json({
      success: true,
      predictionId: prediction.id,
      status: prediction.status
    });
  } catch (error) {
    console.error('Face swap error:', error);
    
    // Enhanced error handling
    if (error instanceof Error) {
      if (error.message.includes('authentication')) {
        return res.status(401).json({ 
          error: 'Authentication failed', 
          details: 'Invalid API token' 
        });
      }
      
      if (error.message.includes('rate limit')) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded', 
          details: 'Too many requests. Please wait before trying again.' 
        });
      }
      
      if (error.message.includes('model')) {
        return res.status(500).json({ 
          error: 'Model error', 
          details: 'The face swap model encountered an error. Please try again.' 
        });
      }
    }
    
    res.status(500).json({ 
      error: 'Face swap failed', 
      details: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
});

router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }

    const filePath = join(__dirname, '../../uploads', filename);
    
    try {
      await fs.unlink(filePath);
      res.json({ success: true, message: 'File deleted' });
    } catch (error) {
      console.error('Error deleting file:', error);
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// Status endpoint for checking prediction progress
router.get('/swap/status/:predictionId', async (req: Request, res: Response) => {
  try {
    const { predictionId } = req.params;
    
    console.log('=== STATUS CHECK DEBUG ===');
    console.log('Checking status for prediction:', predictionId);
    
    if (!predictionId) {
      console.error('No prediction ID provided');
      return res.status(400).json({ error: 'Prediction ID required' });
    }

    const startTime = Date.now();
    console.log('Fetching prediction status from Replicate...');
    
    const prediction = await replicate.predictions.get(predictionId);
    
    const fetchTime = Date.now() - startTime;
    console.log('Status fetched in', fetchTime, 'ms');
    console.log('Current prediction status:', prediction.status);
    console.log('Prediction details:', JSON.stringify(prediction, null, 2));
    
    const responseData = {
      id: prediction.id,
      status: prediction.status,
      output: prediction.output,
      error: prediction.error
    };
    
    console.log('Sending response:', responseData);
    res.json(responseData);
  } catch (error) {
    console.error('=== STATUS CHECK ERROR ===');
    console.error('Status check error:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    
    res.status(500).json({ 
      error: 'Status check failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;