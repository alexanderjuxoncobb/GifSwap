import { motion, useMotionValue, useTransform, type PanInfo } from 'framer-motion';
import { useState } from 'react';
import { springConfig, swipeConfig } from './MotionTrackingProvider';
import { API_BASE_URL } from '../config';

interface MotionResultDisplayProps {
  resultGifUrls: string[];
  selectedGifs: string[];
  onReset: () => void;
}

export default function MotionResultDisplay({ resultGifUrls, onReset }: MotionResultDisplayProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [, setIsDragging] = useState(false);
  
  // Detect if the user is on a mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);
  
  const rotateZ = useTransform(dragX, [-200, 200], [-15, 15]);
  const scale = useTransform(dragY, [-100, 100], [0.9, 1.1]);
  const opacity = useTransform(dragX, [-200, -100, 0, 100, 200], [0.5, 0.8, 1, 0.8, 0.5]);

  const handleDownload = async (gifUrl: string, index: number) => {
    try {
      // Use the optimize endpoint to ensure proper GIF format for WhatsApp
      const optimizeResponse = await fetch(`${API_BASE_URL}/api/optimize-gif`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gifUrl }),
      });
      
      if (!optimizeResponse.ok) {
        throw new Error('Failed to optimize GIF');
      }
      
      const { optimizedGif, format } = await optimizeResponse.json();
      
      // Convert base64 to blob
      const base64Data = optimizedGif.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Use video/mp4 for WhatsApp compatibility
      const mimeType = format === 'mp4' ? 'video/mp4' : 'image/gif';
      const fileExtension = format === 'mp4' ? 'mp4' : 'gif';
      const blob = new Blob([bytes], { type: mimeType });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `whatsapp-reaction-${index + 1}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      
      // Fallback to direct download
      try {
        const a = document.createElement('a');
        a.href = `${API_BASE_URL}/api/download-whatsapp-video?url=${encodeURIComponent(gifUrl)}`;
        a.download = `whatsapp-reaction-${index + 1}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (fallbackError) {
        alert('Failed to download GIF. Please try right-clicking and saving the image.');
      }
    }
  };

  const handleShare = async (gifUrl: string, index: number) => {
    try {
      // Use the optimize endpoint to ensure proper GIF format
      const optimizeResponse = await fetch(`${API_BASE_URL}/api/optimize-gif`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gifUrl }),
      });
      
      if (!optimizeResponse.ok) {
        throw new Error('Failed to optimize GIF');
      }
      
      const { optimizedGif, format } = await optimizeResponse.json();
      
      // Convert base64 to blob
      const base64Data = optimizedGif.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Use appropriate MIME type
      const mimeType = format === 'mp4' ? 'video/mp4' : 'image/gif';
      const fileExtension = format === 'mp4' ? 'mp4' : 'gif';
      const blob = new Blob([bytes], { type: mimeType });
      
      // Check if Web Share API is available and supports file sharing
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `reaction-${index + 1}.${fileExtension}`, { 
          type: mimeType,
          lastModified: new Date().getTime()
        });
        
        const shareData = {
          files: [file],
          title: 'Check out my reaction!',
          text: 'Created with GifSwap'
        };
        
        // Check if the browser can share files
        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          return; // Successfully shared
        }
      }
      
      // Fallback to download if Web Share API is not available
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reaction-${index + 1}.${fileExtension}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (error) {
      console.error('Share/Download error:', error);
      
      // Ultimate fallback: open the GIF in a new tab
      window.open(gifUrl, '_blank');
      alert('Unable to share directly. The image has been opened in a new tab - you can long press to save or share it.');
    }
  };

  const handleDownloadAll = async () => {
    const validResults = resultGifUrls.filter(url => url && url.trim() !== '');
    
    for (let i = 0; i < validResults.length; i++) {
      await handleDownload(validResults[i], i);
      if (i < validResults.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;
    
    if (Math.abs(offset.x) > swipeConfig.swipeBoundary || Math.abs(velocity.x) > swipeConfig.swipeVelocityThreshold) {
      if (offset.x > 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (offset.x < 0 && currentIndex < validResults.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }
    
    setIsDragging(false);
  };

  const validResults = resultGifUrls.filter(url => url && url.trim() !== '');
  const failedCount = resultGifUrls.length - validResults.length;

  if (validResults.length === 0) {
    return (
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Processing failed
        </h2>
        <p className="text-gray-600 mb-8">
          Unfortunately, none of the face swaps could be processed. This can happen if the GIFs don't have clear faces.
        </p>
        <button
          onClick={onReset}
          className="bg-black hover:bg-gray-800 text-white font-light py-2 px-4 rounded-sm transition-colors cursor-pointer text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto text-center">
      <motion.h2 
        className="text-2xl font-bold mb-6 text-gray-800"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springConfig}
      >
        Your reactions are ready!
      </motion.h2>
      
      {failedCount > 0 && (
        <motion.div 
          className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={springConfig}
        >
          <p className="text-sm">
            {failedCount} out of {resultGifUrls.length} face swaps failed to process. 
            This can happen if the GIF doesn't have a clear face.
          </p>
        </motion.div>
      )}
      
      <div className="relative h-[500px] mb-8 overflow-hidden">
        <motion.div 
          className="flex items-center justify-center h-full"
          animate={{ x: -currentIndex * 400 }}
          transition={springConfig}
        >
          {validResults.map((gifUrl, index) => (
            <motion.div
              key={index}
              className="absolute w-full max-w-sm"
              style={{
                x: index * 400,
                rotateZ: index === currentIndex ? rotateZ : 0,
                scale: index === currentIndex ? scale : 0.8,
                opacity: index === currentIndex ? opacity : 0.5,
              }}
              drag={index === currentIndex ? "x" : false}
              dragConstraints={{ left: -200, right: 200 }}
              dragElastic={0.2}
              onDragStart={() => setIsDragging(true)}
              onDragEnd={handleDragEnd}
              whileHover={{ scale: index === currentIndex ? 1.05 : 0.8 }}
              whileTap={{ scale: index === currentIndex ? 0.95 : 0.8 }}
            >
              <div className="p-4">
                <img
                  src={gifUrl}
                  alt={`Face swap result ${index + 1}`}
                  className="max-w-full h-auto mx-auto rounded-2xl shadow-2xl cursor-grab active:cursor-grabbing"
                  draggable={false}
                />
                <motion.div 
                  className="flex gap-2 mt-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: index === currentIndex ? 1 : 0, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {isMobile ? (
                    <motion.button
                      onClick={() => handleShare(gifUrl, index)}
                      className="bg-black hover:bg-gray-800 text-white font-light py-2 px-4 rounded-sm transition-colors flex-1 flex items-center justify-center cursor-pointer text-sm"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                        />
                      </svg>
                      Share GIF
                    </motion.button>
                  ) : (
                    <>
                      <motion.button
                        onClick={() => handleDownload(gifUrl, index)}
                        className="bg-black hover:bg-gray-800 text-white font-light py-2 px-4 rounded-sm transition-colors flex-1 flex items-center justify-center cursor-pointer text-sm"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Download
                      </motion.button>
                      <motion.button
                        onClick={() => handleShare(gifUrl, index)}
                        className="bg-white hover:bg-gray-100 text-black font-light py-2 px-4 rounded-sm transition-colors border border-gray-300 flex items-center justify-center cursor-pointer text-sm"
                        title="Share"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                          />
                        </svg>
                      </motion.button>
                    </>
                  )}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-2 mb-4">
          {validResults.map((_, index) => (
            <motion.button
              key={index}
              className={`w-2 h-2 rounded-full ${index === currentIndex ? 'bg-black' : 'bg-gray-300'}`}
              onClick={() => setCurrentIndex(index)}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.8 }}
            />
          ))}
        </div>
      </div>

      <motion.div 
        className="flex flex-col sm:flex-row gap-4 justify-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {validResults.length > 1 && !isMobile && (
          <motion.button
            onClick={handleDownloadAll}
            className="bg-black hover:bg-gray-800 text-white font-light py-2 px-4 rounded-sm transition-colors flex items-center justify-center cursor-pointer text-sm"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Download All ({validResults.length})
          </motion.button>
        )}
        
        <motion.button
          onClick={onReset}
          className="bg-white hover:bg-gray-100 text-black font-light py-2 px-4 rounded-sm transition-colors cursor-pointer text-sm border border-gray-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Create More
        </motion.button>
      </motion.div>

      <motion.p 
        className="mt-6 text-sm text-gray-600"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        Swipe or drag to navigate through your reactions!
      </motion.p>
    </div>
  );
}