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
    
    // Enhanced error handling with specific Replicate API error handling
    if (error instanceof Error) {
      // Check for Replicate API errors by examining the error message or properties
      if (error.message.includes('402') || error.message.includes('Payment Required') || error.message.includes('Insufficient credit')) {
        return res.status(402).json({ 
          error: 'Insufficient credits', 
          details: 'You have insufficient credits to run this model. Please add credits to your Replicate account at https://replicate.com/account/billing and try again.',
          errorType: 'payment_required'
        });
      }
      
      if (error.message.includes('401') || error.message.includes('authentication') || error.message.includes('Unauthorized')) {
        return res.status(401).json({ 
          error: 'Authentication failed', 
          details: 'Invalid API token. Please check your Replicate API token configuration.',
          errorType: 'auth_error'
        });
      }
      
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded', 
          details: 'Too many requests. Please wait before trying again.',
          errorType: 'rate_limit'
        });
      }
      
      if (error.message.includes('400') || error.message.includes('Bad Request')) {
        return res.status(400).json({ 
          error: 'Invalid request', 
          details: 'The request parameters are invalid. Please check your image data and GIF URL.',
          errorType: 'bad_request'
        });
      }
      
      if (error.message.includes('model') || error.message.includes('prediction')) {
        return res.status(500).json({ 
          error: 'Model error', 
          details: 'The face swap model encountered an error. Please try again with different images.',
          errorType: 'model_error'
        });
      }
      
      if (error.message.includes('network') || error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
        return res.status(503).json({ 
          error: 'Network error', 
          details: 'Network connection failed. Please check your internet connection and try again.',
          errorType: 'network_error'
        });
      }
    }
    
    // Generic error response for unknown errors
    res.status(500).json({ 
      error: 'Face swap failed', 
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      errorType: 'unknown_error'
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
    
    // Enhanced status check error handling
    if (error instanceof Error) {
      if (error.message.includes('402') || error.message.includes('Payment Required') || error.message.includes('Insufficient credit')) {
        return res.status(402).json({ 
          error: 'Insufficient credits', 
          details: 'You have insufficient credits. Please add credits to your Replicate account.',
          errorType: 'payment_required'
        });
      }
      
      if (error.message.includes('401') || error.message.includes('authentication') || error.message.includes('Unauthorized')) {
        return res.status(401).json({ 
          error: 'Authentication failed', 
          details: 'Invalid API token for status check.',
          errorType: 'auth_error'
        });
      }
      
      if (error.message.includes('404') || error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'Prediction not found', 
          details: 'The requested prediction could not be found. It may have expired.',
          errorType: 'not_found'
        });
      }
      
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded', 
          details: 'Too many status requests. Please wait before checking again.',
          errorType: 'rate_limit'
        });
      }
    }
    
    res.status(500).json({ 
      error: 'Status check failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      errorType: 'unknown_error'
    });
  }
});

export default router;