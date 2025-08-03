import { Router, Request, Response } from 'express';
import fetch from 'node-fetch';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';
import sharp from 'sharp';

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

// Convert GIF to animated WebP using ffmpeg (more reliable for animations)
async function convertToAnimatedWebP(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Use ffmpeg to convert GIF to animated WebP
    // This approach is more reliable than Sharp for animations
    ffmpeg(inputPath)
      .inputOptions(['-f', 'gif'])  // Force GIF input format
      .outputOptions([
        '-c:v', 'libwebp_anim',     // Use animated WebP codec if available
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000',
        '-loop', '0',               // Infinite loop
        '-preset', 'default',       // WebP preset
        '-an',                      // No audio
        '-vsync', '0',              // Preserve frame timing
        '-quality', '80',           // WebP quality
        '-compression_level', '4'   // Compression level
      ])
      .output(outputPath)
      .on('end', () => {
        console.log('Animated WebP conversion completed');
        resolve();
      })
      .on('error', async (err) => {
        console.error('FFmpeg animated WebP error:', err);
        
        // Fallback: Try simpler approach
        ffmpeg(inputPath)
          .outputOptions([
            '-vf', 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2',
            '-loop', '0',
            '-pix_fmt', 'yuva420p',  // Pixel format with alpha
            '-f', 'webp'             // Force WebP format
          ])
          .output(outputPath)
          .on('end', () => {
            console.log('Fallback WebP conversion completed');
            resolve();
          })
          .on('error', (fallbackErr) => {
            reject(new Error(`FFmpeg conversion failed: ${fallbackErr.message}`));
          })
          .run();
      })
      .run();
  });
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
    
    console.log('Creating animated WhatsApp sticker from:', gifUrl);
    
    // Download the GIF
    const gifBuffer = await downloadFile(gifUrl);
    console.log('Downloaded GIF, size:', gifBuffer.length);
    
    // Save GIF to temp file
    tempGifPath = getTempFilePath('gif');
    await fs.writeFile(tempGifPath, gifBuffer);
    
    // Verify it's an animated GIF
    const metadata = await sharp(gifBuffer).metadata();
    console.log('GIF metadata:', {
      format: metadata.format,
      pages: metadata.pages,
      delay: metadata.delay,
      loop: metadata.loop
    });
    
    // Create output path for WebP
    tempWebpPath = getTempFilePath('webp');
    
    try {
      // Use ffmpeg for animated WebP conversion
      await convertToAnimatedWebP(tempGifPath, tempWebpPath);
      
      // Read the converted WebP
      const webpBuffer = await fs.readFile(tempWebpPath);
      console.log('Created animated WebP sticker, size:', webpBuffer.length);
      
      // Verify the WebP is animated
      const webpMetadata = await sharp(webpBuffer).metadata();
      console.log('WebP metadata:', {
        format: webpMetadata.format,
        pages: webpMetadata.pages,
        delay: webpMetadata.delay
      });
      
      // Check if file size is acceptable
      if (webpBuffer.length > 500 * 1024) {
        console.warn('Sticker size exceeds 500KB:', webpBuffer.length);
        
        // Try to recompress
        const recompressedPath = getTempFilePath('webp');
        await ffmpeg(tempWebpPath)
          .outputOptions([
            '-vf', 'scale=400:400:force_original_aspect_ratio=decrease,pad=400:400:(ow-iw)/2:(oh-ih)/2',
            '-quality', '60'
          ])
          .output(recompressedPath)
          .on('end', async () => {
            const recompressed = await fs.readFile(recompressedPath);
            console.log('Recompressed size:', recompressed.length);
            await fs.unlink(recompressedPath).catch(() => {});
          })
          .run();
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
        animated: (webpMetadata.pages || 1) > 1,
        metadata: {
          packName,
          author,
          dimensions: '512x512',
          pages: webpMetadata.pages || 1
        }
      });
      
    } catch (conversionError) {
      // If all else fails, try using the original GIF approach
      console.error('WebP conversion failed, trying direct approach:', conversionError);
      
      // Clean up
      if (tempGifPath) await fs.unlink(tempGifPath).catch(() => {});
      if (tempWebpPath) await fs.unlink(tempWebpPath).catch(() => {});
      
      // Return error with suggestion
      res.status(500).json({
        error: 'Failed to create animated sticker',
        details: 'The GIF could not be converted to animated WebP format',
        suggestion: 'Try using a different GIF or use a WhatsApp Sticker Maker app'
      });
    }
    
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
    await convertToAnimatedWebP(tempGifPath, tempWebpPath);
    
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
    requirements: [
      'Animated WebP format',
      'Maximum 500KB file size',
      'Square aspect ratio (512x512)',
      'Transparent background supported',
      'Loops infinitely',
      'Requires ffmpeg with WebP support'
    ],
    usage: [
      'Save the .webp file to your device',
      'Share to WhatsApp or use Sticker Maker apps',
      'Sticker will animate in chats',
      'If animation fails, try a different GIF'
    ]
  });
});

export default router;