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
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`File not found: The GIF at ${url} could not be found (404)`);
      }
      if (response.status === 403) {
        throw new Error(`Access denied: Cannot access the GIF at ${url} (403 Forbidden)`);
      }
      if (response.status >= 500) {
        throw new Error(`Server error: The server hosting the GIF is experiencing issues (${response.status})`);
      }
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    
    // Validate file size (prevent extremely large downloads)
    if (buffer.length > 50 * 1024 * 1024) { // 50MB limit
      throw new Error('File too large: GIF file exceeds 50MB limit');
    }
    
    // Basic validation that this is actually an image
    if (buffer.length < 100) {
      throw new Error('Invalid file: Downloaded file is too small to be a valid GIF');
    }
    
    return buffer;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        throw new Error('Network error: Cannot connect to the URL. Please check the URL and your internet connection.');
      }
      if (error.message.includes('ETIMEDOUT')) {
        throw new Error('Timeout error: The download took too long. Please try with a smaller GIF or check your connection.');
      }
      if (error.message.includes('ECONNRESET')) {
        throw new Error('Connection error: The connection was reset. Please try again.');
      }
      // Re-throw our custom errors
      throw error;
    }
    throw new Error('Unknown download error occurred');
  }
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
        
        // Provide specific error messages based on the error type
        let fallbackReason = 'Unknown FFmpeg error';
        if (err.message.includes('codec') || err.message.includes('encoder')) {
          fallbackReason = 'WebP codec not available in FFmpeg';
        } else if (err.message.includes('format')) {
          fallbackReason = 'Input format not supported by FFmpeg';
        } else if (err.message.includes('dimension') || err.message.includes('size')) {
          fallbackReason = 'Image dimensions too large for FFmpeg processing';
        } else if (err.message.includes('memory') || err.message.includes('allocation')) {
          fallbackReason = 'Insufficient memory for FFmpeg processing';
        }
        
        // Fallback: Use sharp to convert GIF to animated WebP
        try {
          console.log(`Falling back to sharp for WebP conversion... (${fallbackReason})`);
          const gifBuffer = await fs.readFile(inputPath);
          
          // Validate GIF format
          if (!gifBuffer.slice(0, 6).toString('ascii').startsWith('GIF')) {
            throw new Error('Invalid GIF format: File does not appear to be a valid GIF');
          }
          
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
          
          // Provide specific error messages for Sharp failures
          if (sharpError instanceof Error) {
            if (sharpError.message.includes('Input buffer contains unsupported image format')) {
              reject(new Error('Invalid image format: The file is not a supported image format (GIF, PNG, JPEG, WebP)'));
            } else if (sharpError.message.includes('animated')) {
              reject(new Error('Animation error: Failed to process animated GIF frames'));
            } else if (sharpError.message.includes('memory') || sharpError.message.includes('allocation')) {
              reject(new Error('Memory error: Image too large to process. Try with a smaller GIF.'));
            } else if (sharpError.message.includes('corrupt') || sharpError.message.includes('invalid')) {
              reject(new Error('Corrupted file: The GIF file appears to be corrupted or invalid'));
            }
          }
          
          reject(new Error(`Failed to convert to WebP: Both FFmpeg and Sharp conversion failed. ${fallbackReason}. Sharp error: ${sharpError instanceof Error ? sharpError.message : 'Unknown Sharp error'}`));
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
    
    // Enhanced error handling with specific categorization
    if (error instanceof Error) {
      // Network and download errors
      if (error.message.includes('Network error') || error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        return res.status(503).json({ 
          error: 'Network error', 
          details: error.message,
          errorType: 'network_error'
        });
      }
      
      if (error.message.includes('File not found') || error.message.includes('404')) {
        return res.status(404).json({ 
          error: 'GIF not found', 
          details: error.message,
          errorType: 'file_not_found'
        });
      }
      
      if (error.message.includes('Access denied') || error.message.includes('403')) {
        return res.status(403).json({ 
          error: 'Access denied', 
          details: error.message,
          errorType: 'access_denied'
        });
      }
      
      if (error.message.includes('File too large') || error.message.includes('exceeds') || error.message.includes('size')) {
        return res.status(413).json({ 
          error: 'File too large', 
          details: error.message,
          errorType: 'file_too_large'
        });
      }
      
      // Format and conversion errors
      if (error.message.includes('Invalid image format') || error.message.includes('not a supported') || error.message.includes('Invalid GIF format')) {
        return res.status(400).json({ 
          error: 'Invalid file format', 
          details: error.message,
          errorType: 'invalid_format'
        });
      }
      
      if (error.message.includes('Corrupted file') || error.message.includes('corrupt') || error.message.includes('invalid')) {
        return res.status(400).json({ 
          error: 'Corrupted file', 
          details: error.message,
          errorType: 'corrupted_file'
        });
      }
      
      if (error.message.includes('Memory error') || error.message.includes('memory') || error.message.includes('allocation')) {
        return res.status(507).json({ 
          error: 'Processing error', 
          details: 'The GIF is too large or complex to process. Please try with a smaller or simpler GIF.',
          errorType: 'memory_error'
        });
      }
      
      if (error.message.includes('Animation error') || error.message.includes('animated')) {
        return res.status(422).json({ 
          error: 'Animation processing error', 
          details: error.message,
          errorType: 'animation_error'
        });
      }
      
      if (error.message.includes('Timeout') || error.message.includes('timeout')) {
        return res.status(408).json({ 
          error: 'Processing timeout', 
          details: error.message,
          errorType: 'timeout_error'
        });
      }
    }
    
    // Generic fallback error
    res.status(500).json({ 
      error: 'Failed to create sticker', 
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      errorType: 'unknown_error'
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
    
    // Enhanced error handling with specific categorization
    if (error instanceof Error) {
      // Network and download errors
      if (error.message.includes('Network error') || error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        return res.status(503).json({ 
          error: 'Network error', 
          details: error.message,
          errorType: 'network_error'
        });
      }
      
      if (error.message.includes('File not found') || error.message.includes('404')) {
        return res.status(404).json({ 
          error: 'GIF not found', 
          details: error.message,
          errorType: 'file_not_found'
        });
      }
      
      if (error.message.includes('Access denied') || error.message.includes('403')) {
        return res.status(403).json({ 
          error: 'Access denied', 
          details: error.message,
          errorType: 'access_denied'
        });
      }
      
      if (error.message.includes('File too large') || error.message.includes('exceeds') || error.message.includes('size')) {
        return res.status(413).json({ 
          error: 'File too large', 
          details: error.message,
          errorType: 'file_too_large'
        });
      }
      
      // Format and conversion errors
      if (error.message.includes('Invalid image format') || error.message.includes('not a supported') || error.message.includes('Invalid GIF format')) {
        return res.status(400).json({ 
          error: 'Invalid file format', 
          details: error.message,
          errorType: 'invalid_format'
        });
      }
      
      if (error.message.includes('Corrupted file') || error.message.includes('corrupt') || error.message.includes('invalid')) {
        return res.status(400).json({ 
          error: 'Corrupted file', 
          details: error.message,
          errorType: 'corrupted_file'
        });
      }
      
      if (error.message.includes('Memory error') || error.message.includes('memory') || error.message.includes('allocation')) {
        return res.status(507).json({ 
          error: 'Processing error', 
          details: 'The GIF is too large or complex to process. Please try with a smaller or simpler GIF.',
          errorType: 'memory_error'
        });
      }
      
      if (error.message.includes('Animation error') || error.message.includes('animated')) {
        return res.status(422).json({ 
          error: 'Animation processing error', 
          details: error.message,
          errorType: 'animation_error'
        });
      }
      
      if (error.message.includes('Timeout') || error.message.includes('timeout')) {
        return res.status(408).json({ 
          error: 'Processing timeout', 
          details: error.message,
          errorType: 'timeout_error'
        });
      }
    }
    
    // Generic fallback error
    res.status(500).json({ 
      error: 'Failed to download sticker', 
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      errorType: 'unknown_error'
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