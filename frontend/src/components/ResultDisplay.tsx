import { API_BASE_URL } from '../config';

interface ResultDisplayProps {
  resultGifUrls: string[];
  selectedGifs: string[];
  onReset: () => void;
}

export default function ResultDisplay({ resultGifUrls, onReset }: ResultDisplayProps) {
  // Detect if the user is on a mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
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
      // First, try to share the URL directly (simpler and more reliable)
      if (navigator.share) {
        try {
          const shareData = {
            title: 'Check out my reaction!',
            text: 'Made with https://gifswap-production.up.railway.app/',
            url: gifUrl
          };
          
          await navigator.share(shareData);
          return; // Successfully shared URL
        } catch (shareError) {
          // If user cancelled, show instructions
          if (shareError instanceof Error && shareError.name === 'AbortError') {
            setTimeout(() => {
              alert('To share your GIF on WhatsApp:\n\n1. Click Share again\n2. Click the "Allow" button (might be red)\n3. Choose WhatsApp from the share menu\n4. Select a friend or group\n5. Send the GIF\n\nOnce sent, you can copy/save the GIF directly from WhatsApp!\n\n(Sorry, I cba to set up the copy functionality on web 😅)');
            }, 100);
            return;
          }
          console.log('URL share failed, trying file share:', shareError);
        }
      }

      // If URL share failed or not available, try file share
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
      
      // Try file sharing if available
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `reaction-${index + 1}.${fileExtension}`, { 
          type: mimeType,
          lastModified: new Date().getTime()
        });
        
        const shareData = {
          files: [file],
          title: 'Check out my reaction!',
          text: 'Made with https://gifswap-production.up.railway.app/'
        };
        
        // Check if the browser can share files
        if (navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            return; // Successfully shared
          } catch (shareError) {
            // If user cancelled, don't show error
            if (shareError instanceof Error && shareError.name === 'AbortError') {
              return;
            }
            console.log('File share failed:', shareError);
          }
        }
      }
      
      // Fallback to download
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
      
      // Final fallback: direct download from server
      try {
        const a = document.createElement('a');
        a.href = `${API_BASE_URL}/api/download-whatsapp-video?url=${encodeURIComponent(gifUrl)}`;
        a.download = `reaction-${index + 1}.mp4`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (downloadError) {
        // Ultimate fallback: open in new tab
        window.open(gifUrl, '_blank');
        alert('Unable to share directly. The image has been opened in a new tab - you can long press to save or share it.');
      }
    }
  };

  const handleDownloadAll = async () => {
    const validResults = resultGifUrls.filter(url => url && url.trim() !== '');
    
    for (let i = 0; i < validResults.length; i++) {
      await handleDownload(validResults[i], i);
      // Add a small delay between downloads to avoid overwhelming the browser
      if (i < validResults.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const validResults = resultGifUrls.filter(url => url && url.trim() !== '');
  const failedCount = resultGifUrls.length - validResults.length;

  return (
    <div className="max-w-6xl mx-auto text-center">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Your reactions are ready!
      </h2>
      
      {failedCount > 0 && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
          <p className="text-sm">
            {failedCount} out of {resultGifUrls.length} face swaps failed to process. 
            This can happen if the GIF doesn't have a clear face.
          </p>
        </div>
      )}
      
      <div className="flex flex-wrap justify-center gap-6 mb-8 max-w-4xl mx-auto">
        {resultGifUrls.map((gifUrl, index) => (
          <div key={index} className="p-4 flex-shrink-0 w-full max-w-sm animate-fade-in-up" style={{animationDelay: `${index * 100}ms`}}>
            {gifUrl && gifUrl.trim() !== '' ? (
              <>
                <div className="mb-4 flex items-center justify-center">
                  <img
                    src={gifUrl}
                    alt={`Face swap result ${index + 1}`}
                    className="max-w-full h-auto mx-auto rounded-2xl"
                  />
                </div>
                <div className="flex gap-2">
                  {isMobile ? (
                    <button
                      onClick={() => handleShare(gifUrl, index)}
                      className="bg-black hover:bg-gray-800 text-white font-light py-2 px-4 rounded-sm transition-colors flex-1 flex items-center justify-center cursor-pointer text-sm"
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
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleDownload(gifUrl, index)}
                        className="bg-black hover:bg-gray-800 text-white font-light py-2 px-4 rounded-sm transition-colors flex-1 flex items-center justify-center cursor-pointer text-sm"
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
                      </button>
                      <button
                        onClick={() => handleShare(gifUrl, index)}
                        className="bg-white hover:bg-gray-100 text-black font-light py-2 px-4 rounded-sm transition-colors border border-gray-300 flex items-center justify-center cursor-pointer text-sm"
                        title="Share"
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
                      </button>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400 mb-2">
                  <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-500">
                  Failed to process GIF #{index + 1}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {validResults.length > 1 && !isMobile && (
          <button
            onClick={handleDownloadAll}
            className="bg-black hover:bg-gray-800 text-white font-light py-2 px-4 rounded-sm transition-colors flex items-center justify-center cursor-pointer text-sm"
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
          </button>
        )}
        
        <button
          onClick={onReset}
          className="bg-white hover:bg-gray-100 text-black font-light py-2 px-4 rounded-sm transition-colors cursor-pointer text-sm border border-gray-300"
        >
          Create More
        </button>
      </div>

      <p className="mt-6 text-sm text-gray-600">
        Share your hilarious face swaps with friends!
      </p>
    </div>
  );
}