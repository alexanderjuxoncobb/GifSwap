import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const router = Router();

interface StickerRequest {
  gifUrl: string;
  packName?: string;
  author?: string;
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

// Create WhatsApp animated sticker using Sharp
router.post('/create-sticker', async (req: Request<{}, {}, StickerRequest>, res: Response) => {
  try {
    const { gifUrl, packName = 'Face Swap Reactions', author = 'Face Swap App' } = req.body;
    
    if (!gifUrl) {
      return res.status(400).json({ error: 'GIF URL is required' });
    }
    
    console.log('Creating WhatsApp sticker from:', gifUrl);
    
    // Download the GIF
    const gifBuffer = await downloadFile(gifUrl);
    console.log('Downloaded GIF, size:', gifBuffer.length);
    
    let webpBuffer: Buffer;
    
    try {
      // Use sharp to convert GIF to animated WebP
      // Sharp handles animated GIFs well
      webpBuffer = await sharp(gifBuffer, { animated: true })
        .resize(512, 512, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .webp({ 
          quality: 90,           // High quality
          lossless: false,       // Use lossy compression for smaller size
          nearLossless: false,
          smartSubsample: true,
          effort: 4,            // Balance between speed and compression
          loop: 0,              // Infinite loop
          delay: 100            // Default delay between frames
        })
        .toBuffer();
        
      console.log('Created animated WebP sticker, size:', webpBuffer.length);
      
      // Check size and recompress if needed
      if (webpBuffer.length > 500 * 1024) {
        console.log('Sticker too large, recompressing...');
        
        webpBuffer = await sharp(gifBuffer, { animated: true })
          .resize(400, 400, { // Smaller size
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .webp({ 
            quality: 70,       // Lower quality for smaller file
            effort: 6          // More compression effort
          })
          .toBuffer();
          
        console.log('Recompressed sticker size:', webpBuffer.length);
      }
      
    } catch (sharpError) {
      console.error('Sharp processing error:', sharpError);
      
      // Fallback: Try to at least create a static WebP if animation fails
      try {
        console.log('Falling back to static WebP...');
        webpBuffer = await sharp(gifBuffer)
          .resize(512, 512, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 }
          })
          .webp({ quality: 85 })
          .toBuffer();
          
        console.log('Created static WebP as fallback');
      } catch (fallbackError) {
        throw new Error('Failed to create WebP sticker');
      }
    }
    
    // Convert to base64 data URL
    const base64Data = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
    
    res.json({
      success: true,
      sticker: base64Data,
      originalSize: gifBuffer.length,
      stickerSize: webpBuffer.length,
      format: 'webp',
      type: 'animated_sticker',
      metadata: {
        packName,
        author,
        dimensions: '512x512'
      }
    });
    
  } catch (error) {
    console.error('Sticker creation error:', error);
    res.status(500).json({ 
      error: 'Failed to create sticker', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Direct download endpoint for WhatsApp sticker
router.get('/download-sticker', async (req: Request, res: Response) => {
  try {
    const { url, packName = 'Face Swap Reactions', author = 'Face Swap App' } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    console.log('Direct download WhatsApp sticker:', url);
    
    // Download the GIF
    const gifBuffer = await downloadFile(url);
    
    let webpBuffer: Buffer;
    
    try {
      // Convert to animated WebP
      webpBuffer = await sharp(gifBuffer, { animated: true })
        .resize(512, 512, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp({ 
          quality: 90,
          effort: 4,
          loop: 0
        })
        .toBuffer();
    } catch (error) {
      // Fallback to static if animated fails
      console.log('Animated WebP failed, using static');
      webpBuffer = await sharp(gifBuffer)
        .resize(512, 512, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp({ quality: 85 })
        .toBuffer();
    }
    
    // Set proper headers for WebP sticker download
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Content-Disposition', 'attachment; filename="whatsapp-sticker.webp"');
    res.setHeader('Content-Length', webpBuffer.length.toString());
    
    // Send the buffer directly
    res.send(webpBuffer);
    
  } catch (error) {
    console.error('Sticker download error:', error);
    res.status(500).json({ 
      error: 'Failed to download sticker', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get sticker pack info
router.get('/sticker-info', (req: Request, res: Response) => {
  res.json({
    format: 'WebP (Animated)',
    maxSize: '500KB',
    dimensions: '512x512',
    requirements: [
      'Animated WebP format',
      'Maximum 500KB file size',
      'Square aspect ratio (512x512)',
      'Transparent background supported',
      'Loops infinitely'
    ],
    usage: [
      'Save the .webp file to your device',
      'Share to WhatsApp',
      'Or use WhatsApp Sticker Maker apps',
      'Sticker will animate in chats'
    ]
  });
});

export default router;