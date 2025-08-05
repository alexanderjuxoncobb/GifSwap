import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import sharp from 'sharp';

const router = Router();

interface OptimizeRequest {
  gifUrl: string;
}

// Helper function to download file from URL
async function downloadFile(url: string): Promise<Buffer> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  
  const buffer = await response.buffer();
  return buffer;
}

// Helper function to verify if file is a GIF
function isGif(buffer: Buffer): boolean {
  // Check magic numbers for GIF87a or GIF89a
  const magic = buffer.toString('hex', 0, 6);
  return magic === '474946383761' || magic === '474946383961';
}




// Main optimize endpoint with improved quality preservation
router.post('/optimize-gif', async (req: Request<{}, {}, OptimizeRequest>, res: Response): Promise<Response | void> => {
  try {
    const { gifUrl } = req.body;
    
    if (!gifUrl) {
      return res.status(400).json({ error: 'GIF URL is required' });
    }
    
    console.log('Optimizing GIF:', gifUrl);
    
    // Download the GIF
    const gifBuffer = await downloadFile(gifUrl);
    console.log('Downloaded GIF, size:', gifBuffer.length, 'bytes (', (gifBuffer.length / 1024 / 1024).toFixed(2), 'MB)');
    
    // Verify it's actually a GIF
    if (!isGif(gifBuffer)) {
      console.log('File is not a GIF format');
    }
    
    try {
      let optimizedBuffer: Buffer;
      
      // WhatsApp's limit is 16MB, but we'll use different thresholds for quality
      const size = gifBuffer.length;
      const sizeMB = size / 1024 / 1024;
      
      if (sizeMB > 15) {
        // Only resize if absolutely necessary for WhatsApp
        console.log('GIF exceeds 15MB, must resize for WhatsApp...');
        
        const metadata = await sharp(gifBuffer).metadata();
        const scaleFactor = Math.sqrt(14 * 1024 * 1024 / size); // Target 14MB
        const newWidth = Math.floor((metadata.width || 500) * scaleFactor);
        
        optimizedBuffer = await sharp(gifBuffer, { animated: true })
          .resize(newWidth, undefined, {
            withoutEnlargement: true,
            fit: 'inside'
          })
          .gif({
            colours: 200, // Increased from 128 for better quality
            dither: 1.0
          })
          .toBuffer();
          
      } else if (sizeMB > 8) {
        // Mild optimization for larger files
        console.log('GIF is', sizeMB.toFixed(2), 'MB, applying mild optimization...');
        
        optimizedBuffer = await sharp(gifBuffer, { animated: true })
          .gif({
            progressive: true,
            loop: 0
          })
          .toBuffer();
          
      } else {
        // For GIFs under 8MB, return original without any quality loss
        console.log('GIF is', sizeMB.toFixed(2), 'MB, preserving original quality');
        optimizedBuffer = gifBuffer;
      }
      
      console.log('Final GIF size:', optimizedBuffer.length, 'bytes (', (optimizedBuffer.length / 1024 / 1024).toFixed(2), 'MB)');
      
      const base64Data = `data:image/gif;base64,${optimizedBuffer.toString('base64')}`;
      
      res.json({
        success: true,
        optimizedGif: base64Data,
        format: 'gif',
        originalSize: gifBuffer.length,
        optimizedSize: optimizedBuffer.length
      });
      
    } catch (sharpError) {
      console.error('Sharp processing error:', sharpError);
      
      // If Sharp fails, return original
      const base64Data = `data:image/gif;base64,${gifBuffer.toString('base64')}`;
      
      res.json({
        success: true,
        optimizedGif: base64Data,
        format: 'gif',
        originalSize: gifBuffer.length,
        optimizedSize: gifBuffer.length,
        warning: 'Returned original GIF'
      });
    }
    
  } catch (error) {
    console.error('GIF optimization error:', error);
    res.status(500).json({ 
      error: 'Failed to optimize GIF', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Keep the original endpoint for backward compatibility
router.post('/optimize-gif-original', async (req: Request<{}, {}, OptimizeRequest>, res: Response): Promise<Response | void> => {
  try {
    const { gifUrl } = req.body;
    
    if (!gifUrl) {
      return res.status(400).json({ error: 'GIF URL is required' });
    }
    
    console.log('Optimizing GIF (original format):', gifUrl);
    
    // Download the GIF
    const gifBuffer = await downloadFile(gifUrl);
    console.log('Downloaded GIF, size:', gifBuffer.length);
    
    // Verify it's actually a GIF
    if (!isGif(gifBuffer)) {
      console.log('File is not a GIF, attempting to convert...');
    }
    
    // Process with sharp to ensure proper GIF format and optimize
    try {
      let optimizedBuffer: Buffer;
      
      // Check if file size is over 15MB (leaving some margin for WhatsApp's 16MB limit)
      if (gifBuffer.length > 15 * 1024 * 1024) {
        console.log('GIF is too large, resizing...');
        
        const metadata = await sharp(gifBuffer).metadata();
        const scaleFactor = Math.sqrt((15 * 1024 * 1024) / gifBuffer.length);
        const newWidth = Math.floor((metadata.width || 500) * scaleFactor);
        
        optimizedBuffer = await sharp(gifBuffer, { animated: true })
          .resize(newWidth, undefined, {
            withoutEnlargement: true,
            fit: 'inside'
          })
          .gif({
            colours: 128,
            dither: 1.0
          })
          .toBuffer();
      } else {
        optimizedBuffer = await sharp(gifBuffer, { animated: true })
          .gif({
            colours: 256,
            loop: 0
          })
          .toBuffer();
      }
      
      console.log('Optimized GIF size:', optimizedBuffer.length);
      
      const base64Data = `data:image/gif;base64,${optimizedBuffer.toString('base64')}`;
      
      res.json({
        success: true,
        optimizedGif: base64Data,
        originalSize: gifBuffer.length,
        optimizedSize: optimizedBuffer.length
      });
      
    } catch (sharpError) {
      console.error('Sharp processing error:', sharpError);
      
      const base64Data = `data:image/gif;base64,${gifBuffer.toString('base64')}`;
      
      res.json({
        success: true,
        optimizedGif: base64Data,
        originalSize: gifBuffer.length,
        optimizedSize: gifBuffer.length,
        warning: 'Could not optimize, returning original GIF'
      });
    }
    
  } catch (error) {
    console.error('GIF optimization error:', error);
    res.status(500).json({ 
      error: 'Failed to optimize GIF', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});


// Direct download endpoint for regular GIFs
router.get('/download-gif', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    console.log('Direct download GIF:', url);
    
    const gifBuffer = await downloadFile(url);
    
    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Disposition', 'attachment; filename="reaction.gif"');
    res.setHeader('Content-Length', gifBuffer.length);
    
    res.send(gifBuffer);
    
  } catch (error) {
    console.error('GIF download error:', error);
    res.status(500).json({ 
      error: 'Failed to download GIF', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;