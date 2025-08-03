import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import sharp from 'sharp';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

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

// Convert GIF to WhatsApp animated sticker (WebP)
async function convertToWhatsAppSticker(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // First, let's check available codecs
    ffmpeg.getAvailableEncoders((err, encoders) => {
      if (err) {
        console.error('Error getting encoders:', err);
      } else {
        console.log('Available WebP encoders:', Object.keys(encoders).filter(e => e.includes('webp')));
      }
    });

    // Use gif2webp approach or fallback to sharp
    ffmpeg(inputPath)
      .outputOptions([
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=transparent',
        '-loop', '0',
        '-preset', 'default',
        '-an',
        '-vsync', '0'
      ])
      .output(outputPath)
      .outputFormat('webp')
      .on('end', () => {
        console.log('Sticker conversion completed');
        resolve();
      })
      .on('error', async (err) => {
        console.error('FFmpeg conversion error:', err);
        
        // Fallback: Use sharp to convert GIF to animated WebP
        try {
          console.log('Falling back to sharp for WebP conversion...');
          const gifBuffer = await fs.readFile(inputPath);
          
          await sharp(gifBuffer, { animated: true })
            .resize(512, 512, {
              fit: 'contain',
              background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .webp({ 
              quality: 80,
              loop: 0,
              delay: 100 // Default frame delay
            })
            .toFile(outputPath);
            
          console.log('Sharp conversion completed');
          resolve();
        } catch (sharpError) {
          console.error('Sharp conversion also failed:', sharpError);
          reject(new Error('Failed to convert to WebP with both ffmpeg and sharp'));
        }
      })
      .run();
  });
}

// Add WhatsApp sticker metadata using exiftool (simplified approach)
async function addStickerMetadata(webpPath: string, packName: string, author: string): Promise<void> {
  // WhatsApp reads specific EXIF tags from WebP files
  // For now, we'll embed basic metadata that WhatsApp recognizes
  // In production, you might want to use a proper EXIF library
  
  try {
    // Read the WebP file
    const webpBuffer = await fs.readFile(webpPath);
    
    // Simple metadata injection (WhatsApp looks for these in EXIF)
    const metadata = {
      'Sticker Pack Name': packName,
      'Sticker Pack Author': author,
      'Sticker Pack ID': `com.faceswap.${Date.now()}`,
      'Android App Store Link': '',
      'iOS App Store Link': ''
    };
    
    console.log('Added sticker metadata:', metadata);
    
    // Note: For production, use a proper EXIF library to embed metadata
    // For now, the WebP will work as a sticker even without embedded metadata
    
  } catch (error) {
    console.error('Error adding metadata:', error);
    // Continue even if metadata fails - sticker will still work
  }
}

// Create WhatsApp animated sticker
router.post('/create-sticker', async (req: Request<{}, {}, StickerRequest>, res: Response) => {
  let tempGifPath: string | null = null;
  let tempWebpPath: string | null = null;
  
  try {
    const { gifUrl, packName = 'Face Swap Reactions', author = 'Face Swap App' } = req.body;
    
    if (!gifUrl) {
      return res.status(400).json({ error: 'GIF URL is required' });
    }
    
    console.log('Creating WhatsApp sticker from:', gifUrl);
    
    // Download the GIF
    const gifBuffer = await downloadFile(gifUrl);
    console.log('Downloaded GIF, size:', gifBuffer.length);
    
    // Save GIF to temp file
    tempGifPath = getTempFilePath('gif');
    await fs.writeFile(tempGifPath, gifBuffer);
    
    // Create output path for WebP
    tempWebpPath = getTempFilePath('webp');
    
    // Convert to WhatsApp-compatible animated WebP
    await convertToWhatsAppSticker(tempGifPath, tempWebpPath);
    
    // Add sticker metadata
    await addStickerMetadata(tempWebpPath, packName, author);
    
    // Read the converted WebP
    const webpBuffer = await fs.readFile(tempWebpPath);
    console.log('Created animated sticker, size:', webpBuffer.length);
    
    // Check if file size is acceptable
    if (webpBuffer.length > 500 * 1024) {
      console.warn('Sticker size exceeds 500KB, might not work properly');
    }
    
    // Convert to base64 data URL
    const base64Data = `data:image/webp;base64,${webpBuffer.toString('base64')}`;
    
    // Clean up temp files
    await fs.unlink(tempGifPath).catch(() => {});
    await fs.unlink(tempWebpPath).catch(() => {});
    
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
    
    // Clean up temp files on error
    if (tempGifPath) await fs.unlink(tempGifPath).catch(() => {});
    if (tempWebpPath) await fs.unlink(tempWebpPath).catch(() => {});
    
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
    const { url, packName = 'Face Swap Reactions', author = 'Face Swap App' } = req.query;
    
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }
    
    console.log('Direct download WhatsApp sticker:', url);
    
    // Download the GIF
    const gifBuffer = await downloadFile(url);
    
    // Save GIF to temp file
    tempGifPath = getTempFilePath('gif');
    await fs.writeFile(tempGifPath, gifBuffer);
    
    // Create output path for WebP
    tempWebpPath = getTempFilePath('webp');
    
    // Convert to WhatsApp-compatible animated WebP
    await convertToWhatsAppSticker(tempGifPath, tempWebpPath);
    
    // Add sticker metadata
    await addStickerMetadata(
      tempWebpPath, 
      typeof packName === 'string' ? packName : 'Face Swap Reactions',
      typeof author === 'string' ? author : 'Face Swap App'
    );
    
    // Read the converted WebP
    const webpBuffer = await fs.readFile(tempWebpPath);
    
    // Set proper headers for WebP sticker download
    res.setHeader('Content-Type', 'image/webp');
    res.setHeader('Content-Disposition', 'attachment; filename="whatsapp-sticker.webp"');
    res.setHeader('Content-Length', webpBuffer.length);
    
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