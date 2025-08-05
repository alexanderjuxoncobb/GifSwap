import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MotionImageUpload from './components/MotionImageUpload';
import IndividualFaceUpload from './components/IndividualFaceUpload';
import { PhotoGallery } from './components/ui/gallery';
import EnhancedResultDisplay from './components/EnhancedResultDisplay';
import { MotionTrackingProvider } from './components/MotionTrackingProvider';
import { MotionButton } from './components/ui/motion-button';
import { API_BASE_URL } from './config';

type AppState = 'selectGifs' | 'selectMode' | 'upload' | 'individualUpload' | 'processing' | 'result';
type UploadMode = 'single' | 'individual';

function App() {
  const [appState, setAppState] = useState<AppState>('selectGifs');
  const [selectedGifs, setSelectedGifs] = useState<string[]>([]);
  const [, setUploadMode] = useState<UploadMode>('single');
  const [, setUploadedImageData] = useState<string>('');
  const [, setFaceMapping] = useState<Record<string, string>>({});
  const [resultGifUrls, setResultGifUrls] = useState<(string | null)[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState(0);
  const pollIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGifSelect = (gifUrl: string) => {
    setSelectedGifs(prev => {
      if (prev.includes(gifUrl)) {
        return prev.filter(url => url !== gifUrl);
      } else {
        if (prev.length >= 5) {
          alert('You can select a maximum of 5 reactions. Please deselect one to add another.');
          return prev;
        }
        return [...prev, gifUrl];
      }
    });
  };

  const handleImageUpload = (imageData: string) => {
    setUploadedImageData(imageData);
    setAppState('processing');
    processAllGifSwaps(imageData);
  };

  const handleAllFacesUploaded = (faces: Record<string, string>) => {
    setFaceMapping(faces);
    setAppState('processing');
    processAllGifSwapsWithIndividualFaces(faces);
  };

  const processAllGifSwaps = async (imageData: string) => {
    console.log('=== PROCESSING MULTIPLE GIF SWAPS ===');
    console.log('Processing', selectedGifs.length, 'GIFs');
    
    setIsProcessing(true);
    setProcessingStatus('starting');
    setProgress(0);
    setCompletedCount(0);
    
    // Initialize results array with placeholders
    const results: (string | null)[] = new Array(selectedGifs.length).fill(null);
    setResultGifUrls(results);
    
    for (let i = 0; i < selectedGifs.length; i++) {
      const gifUrl = selectedGifs[i];
      setProcessingStatus(`Processing GIF ${i + 1} of ${selectedGifs.length}`);
      
      try {
        console.log(`=== PROCESSING GIF ${i + 1} ===`);
        const result = await processGifSwap(imageData, gifUrl);
        console.log(`=== GIF ${i + 1} COMPLETED ===`, result);
        
        // Update specific index in results array
        setResultGifUrls(prev => {
          const newResults = [...prev];
          newResults[i] = result;
          return newResults;
        });
        
        setCompletedCount(i + 1);
        setProgress(((i + 1) / selectedGifs.length) * 100);
        
        // Navigate to result view after first completion
        if (i === 0) {
          setAppState('result');
        }
      } catch (error) {
        console.error(`Failed to process GIF ${i + 1}:`, error);
        // Update with empty string to indicate failure
        setResultGifUrls(prev => {
          const newResults = [...prev];
          newResults[i] = '';
          return newResults;
        });
      }
    }
    
    console.log('=== ALL PROCESSING COMPLETED ===');
    setIsProcessing(false);
  };

  const processAllGifSwapsWithIndividualFaces = async (faces: Record<string, string>) => {
    console.log('=== PROCESSING MULTIPLE GIF SWAPS WITH INDIVIDUAL FACES ===');
    console.log('Processing', selectedGifs.length, 'GIFs with individual faces');
    
    setIsProcessing(true);
    setProcessingStatus('starting');
    setProgress(0);
    setCompletedCount(0);
    
    // Initialize results array with placeholders
    const results: (string | null)[] = new Array(selectedGifs.length).fill(null);
    setResultGifUrls(results);
    
    for (let i = 0; i < selectedGifs.length; i++) {
      const gifUrl = selectedGifs[i];
      const faceData = faces[gifUrl];
      
      if (!faceData) {
        console.error(`No face data found for GIF: ${gifUrl}`);
        // Update with empty string to indicate failure
        setResultGifUrls(prev => {
          const newResults = [...prev];
          newResults[i] = '';
          return newResults;
        });
        continue;
      }
      
      setProcessingStatus(`Processing GIF ${i + 1} of ${selectedGifs.length}`);
      
      try {
        console.log(`=== PROCESSING GIF ${i + 1} WITH INDIVIDUAL FACE ===`);
        const result = await processGifSwap(faceData, gifUrl);
        console.log(`=== GIF ${i + 1} COMPLETED ===`, result);
        
        // Update specific index in results array
        setResultGifUrls(prev => {
          const newResults = [...prev];
          newResults[i] = result;
          return newResults;
        });
        
        setCompletedCount(i + 1);
        setProgress(((i + 1) / selectedGifs.length) * 100);
        
        // Navigate to result view after first completion
        if (i === 0) {
          setAppState('result');
        }
      } catch (error) {
        console.error(`Failed to process GIF ${i + 1}:`, error);
        // Update with empty string to indicate failure
        setResultGifUrls(prev => {
          const newResults = [...prev];
          newResults[i] = '';
          return newResults;
        });
      }
    }
    
    console.log('=== ALL PROCESSING COMPLETED ===');
    setIsProcessing(false);
  };
  
  const processGifSwap = async (imageData: string, gifUrl: string): Promise<string> => {
    console.log('=== PROCESSING SINGLE GIF SWAP ===');
    console.log('GIF URL:', gifUrl);
    
    const requestBody = {
      sourceImageData: imageData,
      targetGifUrl: gifUrl,
    };
    
    const response = await fetch(`${API_BASE_URL}/api/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.predictionId) {
      throw new Error(data.error || 'Face swap failed');
    }
    
    // Poll for completion
    return await pollPredictionStatus(data.predictionId);
  };
  
  const pollPredictionStatus = async (predictionId: string): Promise<string> => {
    console.log('=== FRONTEND POLLING START ===');
    console.log('Polling for prediction:', predictionId);
    
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          console.log('Making poll request for:', predictionId);
          const response = await fetch(`${API_BASE_URL}/api/swap/status/${predictionId}`);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          console.log('Poll response:', data);
          
          if (data.status === 'succeeded') {
            console.log('SUCCESS! Resolving with output:', data.output);
            resolve(data.output);
          } else if (data.status === 'failed') {
            console.log('FAILED! Rejecting with error:', data.error);
            reject(new Error(data.error || 'Face swap failed'));
          } else if (data.status === 'canceled') {
            console.log('CANCELED! Rejecting');
            reject(new Error('Face swap was canceled'));
          } else {
            console.log('Still processing, will poll again in 3 seconds. Status:', data.status);
            setTimeout(poll, 3000);
          }
        } catch (error) {
          console.error('Poll error:', error);
          reject(error);
        }
      };
      
      poll();
    });
  };


  const handleReset = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    setAppState('selectGifs');
    setSelectedGifs([]);
    setUploadMode('single');
    setUploadedImageData('');
    setFaceMapping({});
    setResultGifUrls([]);
    setIsProcessing(false);
    setProcessingStatus('');
    setProgress(0);
    setCompletedCount(0);
  };

  // Scroll to top when app state changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [appState]);

  return (
    <MotionTrackingProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col">
        <motion.div 
          className="absolute top-2 left-2 sm:top-4 sm:left-4 z-50"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.button 
            onClick={handleReset} 
            className="cursor-pointer"
            whileHover={{ scale: 1.1, rotate: 360 }}
            transition={{ duration: 0.3 }}
          >
            <img src="/logo.svg" alt="Logo" className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" />
          </motion.button>
        </motion.div>
        <div className="w-full mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex-1 max-w-[1600px]">
          <AnimatePresence mode="wait">
            {appState === 'selectGifs' && (
              <motion.div
                key="selectGifs"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.5 }}
              >
                <PhotoGallery 
                  onMemeSelect={handleGifSelect}
                  selectedMemes={selectedGifs}
                />
                <motion.div 
                  className="text-center mt-4 sm:mt-24 lg:mt-20 relative z-50 pb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: selectedGifs.length > 0 ? 1 : 0, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {selectedGifs.length > 0 && (
                    <MotionButton
                      onClick={() => setAppState('selectMode')}
                      variant="primary"
                      size="md"
                    >
                      Continue with {selectedGifs.length} reaction{selectedGifs.length !== 1 ? 's' : ''}
                    </MotionButton>
                  )}
                </motion.div>
              </motion.div>
            )}

            {appState === 'selectMode' && (
              <motion.div
                key="selectMode"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-2xl mx-auto px-4 sm:px-0"
              >
                <motion.div 
                  className="text-center mb-6 sm:mb-8"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h2 className="text-xl sm:text-2xl font-light text-gray-800 mb-3 sm:mb-4">Choose Upload Mode</h2>
                  <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">
                    How would you like to upload faces for your {selectedGifs.length} selected reaction{selectedGifs.length !== 1 ? 's' : ''}?
                  </p>
                  <div className="flex justify-center">
                    <MotionButton
                      onClick={() => setAppState('selectGifs')}
                      variant="secondary"
                      size="sm"
                      className="flex items-center"
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
                          d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                      </svg>
                      Change selection
                    </MotionButton>
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <motion.div
                    initial={{ opacity: 0, y: 20, x: 0 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border-2 border-transparent hover:border-gray-200 transition-all cursor-pointer"
                    onClick={() => {
                      setUploadMode('single');
                      setAppState('upload');
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-center">
                      <motion.div 
                        className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                      >
                        <svg
                          className="w-8 h-8 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                      </motion.div>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">Same Face for All</h3>
                      <p className="text-sm text-gray-600">
                        Upload one face that will be applied to all selected reactions
                      </p>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20, x: 0 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border-2 border-transparent hover:border-gray-200 transition-all cursor-pointer"
                    onClick={() => {
                      setUploadMode('individual');
                      setAppState('individualUpload');
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-center">
                      <motion.div 
                        className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center"
                        whileHover={{ rotate: -360 }}
                        transition={{ duration: 0.5 }}
                      >
                        <svg
                          className="w-8 h-8 text-gray-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </motion.div>
                      <h3 className="text-lg font-medium text-gray-800 mb-2">Individual Faces</h3>
                      <p className="text-sm text-gray-600">
                        Upload a different face for each selected reaction
                      </p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}

            {appState === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div 
                  className="text-center mb-4 sm:mb-6 px-4 sm:px-0 mt-16 sm:mt-16 lg:mt-0"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-3 sm:mb-4">
                    Now upload your photo to swap into the selected reactions:
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                    Selected {selectedGifs.length} reaction{selectedGifs.length !== 1 ? 's' : ''}
                  </p>
                  <div className="flex justify-center">
                    <MotionButton
                      onClick={() => setAppState('selectMode')}
                      variant="secondary"
                      size="sm"
                      className="flex items-center"
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
                          d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                      </svg>
                      Change mode
                    </MotionButton>
                  </div>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <MotionImageUpload onImageUpload={handleImageUpload} />
                </motion.div>
              </motion.div>
            )}

            {appState === 'individualUpload' && (
              <motion.div
                key="individualUpload"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.5 }}
              >
                <IndividualFaceUpload
                  selectedGifs={selectedGifs}
                  onAllFacesUploaded={handleAllFacesUploaded}
                  onBack={() => setAppState('selectMode')}
                />
              </motion.div>
            )}

            {appState === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col items-center justify-center min-h-[300px] sm:min-h-[400px] w-full max-w-md mx-auto px-4 sm:px-0"
              >
                <motion.h2 
                  className="text-lg sm:text-xl lg:text-2xl font-light text-gray-800 mb-4 sm:mb-6"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  Creating your reactions
                </motion.h2>
                <motion.p 
                  className="text-xs sm:text-sm text-gray-600 mb-2"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {processingStatus}
                </motion.p>
                <p className="text-xs text-gray-500 mb-4 sm:mb-6">
                  Completed: {completedCount} of {selectedGifs.length}
                </p>
                <motion.div 
                  className="w-full bg-gray-200 rounded-full h-2 mb-3 sm:mb-4 overflow-hidden"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <motion.div 
                    className="bg-black h-2 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </motion.div>
                <motion.p 
                  className="text-xs text-gray-400 text-center px-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                >
                  Each reaction takes 1-3 minutes to process
                </motion.p>
              </motion.div>
            )}

            {appState === 'result' && (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <EnhancedResultDisplay
                  resultGifUrls={resultGifUrls}
                  selectedGifs={selectedGifs}
                  onReset={handleReset}
                  isProcessing={isProcessing}
                  processingStatus={processingStatus}
                  completedCount={completedCount}
                />
              </motion.div>
            )}
          </AnimatePresence>
      </div>
      
      <footer className="py-3 sm:py-4 relative z-10">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 text-center max-w-[1600px]">
          <p className="text-xs sm:text-sm text-gray-500 font-mono">
            Made by{' '}
            <a 
              href="https://github.com/alexanderjuxoncobb" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-400 hover:underline"
            >
              Alex
            </a>
            {' '}&{' '}
            <a 
              href="https://github.com/rayan-saleh" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-400 hover:underline"
            >
              Rayan
            </a>
          </p>
        </div>
      </footer>
    </div>
    </MotionTrackingProvider>
  );
}

export default App;