import { motion } from 'framer-motion';
import { MotionButton } from './ui/motion-button';
import { API_BASE_URL } from '../config';

interface ResultDisplayProps {
  resultGifUrls: (string | null)[];
  selectedGifs: string[];
  onReset: () => void;
  isProcessing?: boolean;
  processingStatus?: string;
  completedCount?: number;
}

export default function EnhancedResultDisplay({ resultGifUrls, onReset, isProcessing, processingStatus }: ResultDisplayProps) {
  // Detect if the user is on a mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const handleDownload = async (gifUrl: string, index: number) => {
    try {
      const endpoint = `${API_BASE_URL}/api/optimize-gif-original`;
      const filename = `reaction-${index + 1}.gif`;
      const mimeType = 'image/gif';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gifUrl }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to process file');
      }
      
      const data = await response.json();
      const content = data.optimizedGif;
      
      // Convert base64 to blob
      const base64Data = content.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: mimeType });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      
      // Fallback to direct download
      try {
        const fallbackUrl = `${API_BASE_URL}/api/download-gif?url=${encodeURIComponent(gifUrl)}`;
        
        const a = document.createElement('a');
        a.href = fallbackUrl;
        a.download = 'reaction.gif';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (fallbackError) {
        alert('Failed to download. Please make sure the backend server is running and try again.');
      }
    }
  };

  const handleCopyToClipboard = async (gifUrl: string) => {
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
      // Use video/mp4 for WhatsApp compatibility
      const mimeType = format === 'mp4' ? 'video/mp4' : 'image/gif';
      const blob = new Blob([bytes], { type: mimeType });
      
      if (navigator.clipboard && window.ClipboardItem) {
        const clipboardData: Record<string, Blob> = format === 'mp4' 
          ? { 'video/mp4': blob }
          : { 'image/gif': blob };
        
        await navigator.clipboard.write([
          new ClipboardItem(clipboardData)
        ]);
        alert(format === 'mp4' ? 'Video copied to clipboard!' : 'GIF copied to clipboard!');
      } else {
        // Fallback: copy the URL if clipboard API not supported
        await navigator.clipboard.writeText(gifUrl);
        alert('Image URL copied to clipboard!');
      }
    } catch (error) {
      console.error('Copy error:', error);
      // Fallback: try to copy URL
      try {
        await navigator.clipboard.writeText(gifUrl);
        alert('Image URL copied to clipboard!');
      } catch (fallbackError) {
        alert('Failed to copy to clipboard. Your browser may not support this feature.');
      }
    }
  };

  const handleDownloadAll = async () => {
    const validResults = resultGifUrls.filter(url => url && url.trim() !== '') as string[];
    
    for (let i = 0; i < validResults.length; i++) {
      await handleDownload(validResults[i], i);
      if (i < validResults.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const validResults = resultGifUrls.filter(url => url && url.trim() !== '') as string[];
  const loadingCount = resultGifUrls.filter(url => url === null).length;
  const failedCount = resultGifUrls.filter(url => url === '').length;

  return (
    <motion.div 
      className="w-full max-w-7xl mx-auto text-center px-4 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h2 
        className="text-xl sm:text-2xl font-light text-gray-800 mb-4 sm:mb-6 lg:mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {loadingCount > 0 
          ? `Processing your reactions... (${validResults.length + failedCount} of ${resultGifUrls.length} completed)`
          : 'Your reactions are ready!'
        }
      </motion.h2>
      
      {isProcessing && processingStatus && (
        <motion.div 
          className="mb-3 sm:mb-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-xs sm:text-sm">
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {processingStatus}
            </motion.span>
          </p>
        </motion.div>
      )}
      
      {failedCount > 0 && (
        <motion.div 
          className="mb-4 sm:mb-6 p-3 sm:p-4 bg-yellow-50 border border-yellow-200 text-yellow-700 rounded-lg max-w-2xl mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="text-xs sm:text-sm">
            {failedCount} out of {resultGifUrls.length} face swaps failed to process. 
            This can happen if the GIF doesn't have a clear face.
          </p>
        </motion.div>
      )}
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8 w-full">
        {resultGifUrls.map((gifUrl, index) => (
          <motion.div 
            key={index} 
            className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            whileHover={{ y: -4 }}
          >
            {gifUrl === null ? (
              // Loading state
              <div className="w-full aspect-square flex flex-col items-center justify-center bg-gray-50">
                <motion.div 
                  className="w-16 h-16 mb-4"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                >
                  <svg className="w-full h-full text-gray-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </motion.div>
                <p className="text-xs sm:text-sm text-gray-500">
                  Processing GIF #{index + 1}...
                </p>
              </div>
            ) : gifUrl && gifUrl.trim() !== '' ? (
              <>
                <div className="relative bg-gradient-to-br from-gray-50 to-gray-100 p-4 sm:p-6">
                  <div className="absolute top-2 left-2 z-10 bg-black text-white text-xs font-medium px-2 py-1 rounded-full shadow-md">
                    #{index + 1}
                  </div>
                  <motion.div 
                    className="relative"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <img
                      src={gifUrl}
                      alt={`Face swap result ${index + 1}`}
                      className="w-auto h-auto max-w-full rounded-lg shadow-md"
                      style={{ maxHeight: '600px', minHeight: '200px' }}
                    />
                  </motion.div>
                </div>
                <div className="p-3 sm:p-4 bg-white border-t border-gray-100">
                  <MotionButton
                    onClick={() => isMobile ? handleCopyToClipboard(gifUrl) : handleDownload(gifUrl, index)}
                    variant="primary"
                    size="md"
                    className="w-full flex items-center justify-center"
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
                        d={isMobile 
                          ? "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          : "M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        }
                      />
                    </svg>
                    {isMobile ? 'Copy GIF' : 'Download GIF'}
                  </MotionButton>
                </div>
              </>
            ) : (
              <div className="w-full aspect-square flex flex-col items-center justify-center bg-red-50 relative">
                <div className="absolute top-2 left-2 z-10 bg-red-600 text-white text-xs font-medium px-2 py-1 rounded-full shadow-md">
                  #{index + 1}
                </div>
                <div className="text-red-400 mb-2">
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <p className="text-xs sm:text-sm text-red-600 font-medium">
                  Failed to process
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <motion.div 
        className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        {validResults.length > 1 && !isMobile && (
          <MotionButton
            onClick={handleDownloadAll}
            variant="primary"
            size="md"
            className="flex items-center justify-center"
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
          </MotionButton>
        )}
        
        <MotionButton
          onClick={onReset}
          variant="secondary"
          size="md"
        >
          Create More
        </MotionButton>
      </motion.div>
    </motion.div>
  );
}