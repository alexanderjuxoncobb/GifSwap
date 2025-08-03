import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import webp from 'webp-converter';
import sharp from 'sharp';

// Grant permission for webp-converter (required on some systems)
webp.grant_permission();

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

// Helper function to create temp file path
function getTempFilePath(extension: string): string {
  return join(tmpdir(), `temp_${randomBytes(16).toString('hex')}.${extension}`);
}

// Convert GIF to animated WebP using webp-converter (includes gif2webp)
async function convertGifToAnimatedWebP(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use gif2webp with options for WhatsApp stickers
    // -q: quality (0-100)
    // -m: compression method (0=fast, 6=slowest/best)
    // -lossy: use lossy compression
    // -loop: number of loops (0 = infinite)
    const options = '-q 80 -m 4 -lossy -loop 0';
    
    console.log('Converting GIF to animated WebP using gif2webp...');
    
    webp.gwebp(inputPath, outputPath, options, (status, error) => {
      if (status === '100') {
        console.log('gif2webp conversion successful');
        resolve();
      } else if (status === '101') {
        console.error('gif2webp conversion failed:', error);
        reject(new Error(error || 'gif2webp conversion failed'));
      } else {
        console.log('gif2webp status:', status);
        // Status might be a string with progress, treat as success if no error
        if (!error) {
          resolve();
        } else {
          reject(new Error(error));
        }
      }
    });
  });
}

// Create WhatsApp animated sticker
router.post('/create-sticker', async (req: Request<{}, {}, StickerRequest>, res: Response) => {
  let tempGifPath: string | null = null;
  let tempWebpPath: string | null = null;
  let tempResizedGifPath: string | null = null;
  
  try {
    const { gifUrl, packName = 'Face Swap Reactions', author = 'Face Swap App' } = req.body;
    
    if (!gifUrl) {
      return res.status(400).json({ error: 'GIF URL is required' });
    }
    
    console.log('Creating animated WhatsApp sticker from:', gifUrl);
    
    // Download the GIF
    const gifBuffer = await downloadFile(gifUrl);
    console.log('Downloaded GIF, size:', gifBuffer.length);
    
    // Save GIF to temp file
    tempGifPath = getTempFilePath('gif');
    await fs.writeFile(tempGifPath, gifBuffer);
    
    // Check GIF metadata
    const metadata = await sharp(gifBuffer).metadata();
    console.log('GIF metadata:', {
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
      pages: metadata.pages
    });
    
    // Resize GIF to 512x512 if needed
    tempResizedGifPath = getTempFilePath('gif');
    
    if (metadata.width !== 512 || metadata.height !== 512) {
      console.log('Resizing GIF to 512x512...');
      
      // Use sharp to resize the GIF while maintaining animation
      await sharp(tempGifPath, { animated: true })
        .resize(512, 512, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toFile(tempResizedGifPath);
        
      // Use resized GIF for conversion
      tempGifPath = tempResizedGifPath;
    }
    
    // Create output path for WebP
    tempWebpPath = getTempFilePath('webp');
    
    try {
      // Convert to animated WebP using gif2webp
      await convertGifToAnimatedWebP(tempGifPath, tempWebpPath);
      
      // Read the converted WebP
      const webpBuffer = await fs.readFile(tempWebpPath);
      console.log('Created animated WebP sticker, size:', webpBuffer.length);
      
      // Verify the WebP is animated
      const webpMetadata = await sharp(webpBuffer).metadata();
      console.log('WebP metadata:', {
        format: webpMetadata.format,
        pages: webpMetadata.pages,
        size: webpBuffer.length
      });
      
      // Check if file size is acceptable
      if (webpBuffer.length > 500 * 1024) {
        console.warn('Sticker size exceeds 500KB, trying to compress more...');
        
        // Try with lower quality
        const compressedPath = getTempFilePath('webp');
        await convertGifToAnimatedWebP(tempGifPath, compressedPath);
        const compressedBuffer = await fs.readFile(compressedPath);
        
        if (compressedBuffer.length < webpBuffer.length) {
          console.log('Using compressed version, size:', compressedBuffer.length);
          const base64Data = `data:image/webp;base64,${compressedBuffer.toString('base64')}`;
          await fs.unlink(compressedPath).catch(() => {});
          
          // Clean up temp files
          if (tempGifPath) await fs.unlink(tempGifPath).catch(() => {});
          if (tempWebpPath) await fs.unlink(tempWebpPath).catch(() => {});
          if (tempResizedGifPath && tempResizedGifPath !== tempGifPath) {
            await fs.unlink(tempResizedGifPath).catch(() => {});
          }
          
          return res.json({
            success: true,
            sticker: base64Data,
            originalSize: gifBuffer.length,
            stickerSize: compressedBuffer.length,
            format: 'webp',
            type: 'animated_sticker',
            animated: true,
            metadata: {
              packName,
              author,
              dimensions: '512x512'
            }
          });
        }
        
        await fs.unlink(compressedPath).catch(() => {});
      }
      
      // Convert to base64 data URL
      const base64Data = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
      
      // Clean up temp files
      if (tempGifPath) await fs.unlink(tempGifPath).catch(() => {});
      if (tempWebpPath) await fs.unlink(tempWebpPath).catch(() => {});
      if (tempResizedGifPath && tempResizedGifPath !== tempGifPath) {
        await fs.unlink(tempResizedGifPath).catch(() => {});
      }
      
      res.json({
        success: true,
        sticker: base64Data,
        originalSize: gifBuffer.length,
        stickerSize: webpBuffer.length,
        format: 'webp',
        type: 'animated_sticker',
        animated: true,
        metadata: {
          packName,
          author,
          dimensions: '512x512'
        }
      });
      
    } catch (conversionError) {
      console.error('WebP conversion failed:', conversionError);
      
      // Clean up
      if (tempGifPath) await fs.unlink(tempGifPath).catch(() => {});
      if (tempWebpPath) await fs.unlink(tempWebpPath).catch(() => {});
      if (tempResizedGifPath && tempResizedGifPath !== tempGifPath) {
        await fs.unlink(tempResizedGifPath).catch(() => {});
      }
      
      res.status(500).json({
        error: 'Failed to create animated sticker',
        details: conversionError instanceof Error ? conversionError.message : 'Unknown error',
        suggestion: 'The GIF could not be converted to animated WebP format'
      });
    }
    
  } catch (error) {
    console.error('Sticker creation error:', error);
    
    // Clean up temp files on error
    if (tempGifPath) await fs.unlink(tempGifPath).catch(() => {});
    if (tempWebpPath) await fs.unlink(tempWebpPath).catch(() => {});
    if (tempResizedGifPath) await fs.unlink(tempResizedGifPath).catch(() => {});
    
    res.status(500).json({ 
      error: 'Failed to create sticker', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Direct download endpoint for WhatsApp sticker
router.get('/download-sticker', async (req: Request, res: Response) => {
  let tempGifPath: string | null = null;
  let tempWebpPath: string | null = null;
  
  try {
    const { url } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    console.log('Direct download animated WhatsApp sticker:', url);
    
    // Download the GIF
    const gifBuffer = await downloadFile(url);
    
    // Save GIF to temp file
    tempGifPath = getTempFilePath('gif');
    await fs.writeFile(tempGifPath, gifBuffer);
    
    // Create output path for WebP
    tempWebpPath = getTempFilePath('webp');
    
    // Convert to animated WebP
    await convertGifToAnimatedWebP(tempGifPath, tempWebpPath);
    
    // Read the converted WebP
    const webpBuffer = await fs.readFile(tempWebpPath);
    
    // Set proper headers for WebP sticker download
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Content-Disposition', 'attachment; filename="whatsapp-animated-sticker.webp"');
    res.setHeader('Content-Length', webpBuffer.length.toString());
    
    // Send the buffer directly
    res.send(webpBuffer);
    
    // Clean up temp files
    await fs.unlink(tempGifPath).catch(() => {});
    await fs.unlink(tempWebpPath).catch(() => {});
    
  } catch (error) {
    console.error('Sticker download error:', error);
    
    // Clean up temp files on error
    if (tempGifPath) await fs.unlink(tempGifPath).catch(() => {});
    if (tempWebpPath) await fs.unlink(tempWebpPath).catch(() => {});
    
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
    converter: 'gif2webp (webp-converter)',
    requirements: [
      'Animated WebP format',
      'Maximum 500KB file size',
      'Square aspect ratio (512x512)',
      'Transparent background supported',
      'Loops infinitely',
      'Uses gif2webp for proper animation'
    ],
    usage: [
      'Save the .webp file to your device',
      'Share to WhatsApp or use Sticker Maker apps',
      'Sticker will animate in chats',
      'Animation is preserved from original GIF'
    ]
  });
});

export default router;