import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import sharp from 'sharp';
import { promises as fs } from 'fs';

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

// Create WhatsApp sticker (simplified version that works)
router.post('/create-sticker', async (req: Request<{}, {}, StickerRequest>, res: Response) => {
  try {
    const { gifUrl, packName = 'Face Swap Reactions', author = 'Face Swap App' } = req.body;
    
    if (!gifUrl) {
      return res.status(400).json({ error: 'GIF URL is required' });
    }
    
    console.log('Creating WhatsApp sticker from:', gifUrl);
    
    // For now, just return the original GIF as a fallback
    // Users can use WhatsApp Sticker Maker apps to convert properly
    const gifBuffer = await downloadFile(gifUrl);
    console.log('Downloaded GIF, size:', gifBuffer.length);
    
    // Try to create a static WebP at least
    let webpBuffer: Buffer;
    try {
      // Create a static WebP from the first frame
      webpBuffer = await sharp(gifBuffer)
        .resize(512, 512, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .webp({ quality: 90 })
        .toBuffer();
        
      console.log('Created static WebP sticker, size:', webpBuffer.length);
    } catch (error) {
      console.error('Failed to create WebP:', error);
      // Return the original GIF
      webpBuffer = gifBuffer;
    }
    
    // Convert to base64 data URL
    const base64Data = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
    
    res.json({
      success: true,
      sticker: base64Data,
      originalSize: gifBuffer.length,
      stickerSize: webpBuffer.length,
      format: 'webp',
      type: 'static_sticker',
      animated: false,
      metadata: {
        packName,
        author,
        dimensions: '512x512',
        note: 'This is a static sticker. For animated stickers, use a WhatsApp Sticker Maker app.'
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

// Alternative: Return original GIF for manual conversion
router.post('/get-gif-for-sticker', async (req: Request<{}, {}, StickerRequest>, res: Response) => {
  try {
    const { gifUrl } = req.body;
    
    if (!gifUrl) {
      return res.status(400).json({ error: 'GIF URL is required' });
    }
    
    // Download and return the GIF
    const gifBuffer = await downloadFile(gifUrl);
    
    // Convert to base64 data URL
    const base64Data = `data:image/gif;base64,${gifBuffer.toString('base64')}`;
    
    res.json({
      success: true,
      gif: base64Data,
      size: gifBuffer.length,
      format: 'gif',
      instructions: [
        '1. Download this GIF',
        '2. Use "Sticker Maker Studio" (iOS) or "Sticker.ly" (Android)',
        '3. Import the GIF to create an animated sticker',
        '4. The app will convert it to animated WebP',
        '5. Add to WhatsApp!'
      ]
    });
    
  } catch (error) {
    console.error('GIF fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to get GIF', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Direct download endpoint
router.get('/download-sticker', async (req: Request, res: Response) => {
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    console.log('Direct download sticker:', url);
    
    // Download the GIF
    const gifBuffer = await downloadFile(url);
    
    // Create static WebP
    const webpBuffer = await sharp(gifBuffer)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .webp({ quality: 90 })
      .toBuffer();
    
    // Set proper headers
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Content-Disposition', 'attachment; filename="whatsapp-sticker.webp"');
    res.setHeader('Content-Length', webpBuffer.length.toString());
    
    // Send the buffer
    res.send(webpBuffer);
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      error: 'Failed to download sticker', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get sticker pack info
router.get('/sticker-info', (req: Request, res: Response) => {
  res.json({
    format: 'WebP (Static) / GIF (for apps)',
    maxSize: '500KB',
    dimensions: '512x512',
    status: 'Working',
    options: [
      {
        method: 'Static WebP',
        description: 'Downloads a static WebP sticker (first frame only)'
      },
      {
        method: 'GIF + Sticker App',
        description: 'Download GIF and use WhatsApp Sticker Maker app for animation'
      }
    ],
    recommendedApps: {
      iOS: ['Sticker Maker Studio', 'WSTick'],
      Android: ['Sticker.ly', 'Sticker Maker by Viko']
    }
  });
});

export default router;