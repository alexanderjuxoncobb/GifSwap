import { API_BASE_URL } from '../config';

interface ResultDisplayProps {
  resultGifUrls: string[];
  selectedGifs: string[];
  onReset: () => void;
}

export default function ResultDisplay({ resultGifUrls, onReset }: ResultDisplayProps) {
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
                <div className="mb-4">
                  <img
                    src={gifUrl}
                    alt={`Face swap result ${index + 1}`}
                    className="max-w-full h-auto mx-auto rounded-2xl"
                  />
                </div>
                <div className="flex gap-2">
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
                    onClick={() => handleCopyToClipboard(gifUrl)}
                    className="bg-white hover:bg-gray-100 text-black font-light py-2 px-4 rounded-sm transition-colors border border-gray-300 flex items-center justify-center cursor-pointer text-sm"
                    title="Copy to clipboard"
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
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </button>
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
        {validResults.length > 1 && (
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