import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springConfig } from './MotionTrackingProvider';
import { MotionButton } from './ui/motion-button';
import { API_BASE_URL } from '../config';

interface IndividualFaceUploadProps {
  selectedGifs: string[];
  onAllFacesUploaded: (faceMapping: Record<string, string>) => void;
  onBack: () => void;
}

interface UploadState {
  isUploading: boolean;
  preview: string | null;
  isDragging: boolean;
}

export default function IndividualFaceUpload({ 
  selectedGifs, 
  onAllFacesUploaded,
  onBack
}: IndividualFaceUploadProps) {
  const [faceMapping, setFaceMapping] = useState<Record<string, string>>({});
  const [uploadStates, setUploadStates] = useState<Record<string, UploadState>>(() => {
    const initialStates: Record<string, UploadState> = {};
    selectedGifs.forEach(gif => {
      initialStates[gif] = {
        isUploading: false,
        preview: null,
        isDragging: false
      };
    });
    return initialStates;
  });
  
  const fileInputRefs = useRef<Record<string, HTMLInputElement>>({});

  const allFacesUploaded = Object.keys(faceMapping).length === selectedGifs.length;

  const handleDragOver = (e: DragEvent<HTMLDivElement>, gifUrl: string) => {
    e.preventDefault();
    setUploadStates(prev => ({
      ...prev,
      [gifUrl]: { ...prev[gifUrl], isDragging: true }
    }));
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>, gifUrl: string) => {
    e.preventDefault();
    setUploadStates(prev => ({
      ...prev,
      [gifUrl]: { ...prev[gifUrl], isDragging: false }
    }));
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>, gifUrl: string) => {
    e.preventDefault();
    setUploadStates(prev => ({
      ...prev,
      [gifUrl]: { ...prev[gifUrl], isDragging: false }
    }));

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFile(files[0], gifUrl);
    }
  };

  const handleFileInput = async (e: ChangeEvent<HTMLInputElement>, gifUrl: string) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFile(files[0], gifUrl);
    }
  };

  const handleFile = async (file: File, gifUrl: string) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setUploadStates(prev => ({
      ...prev,
      [gifUrl]: { ...prev[gifUrl], isUploading: true }
    }));

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      if (data.success && data.base64Data) {
        setUploadStates(prev => ({
          ...prev,
          [gifUrl]: { 
            ...prev[gifUrl], 
            isUploading: false,
            preview: data.base64Data 
          }
        }));
        
        setFaceMapping(prev => ({
          ...prev,
          [gifUrl]: data.base64Data
        }));
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
      setUploadStates(prev => ({
        ...prev,
        [gifUrl]: { ...prev[gifUrl], isUploading: false }
      }));
    }
  };

  const handleProceed = () => {
    if (allFacesUploaded) {
      onAllFacesUploaded(faceMapping);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springConfig}
    >
      <motion.div 
        className="text-center mb-4 sm:mb-6 px-4 sm:px-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-xl sm:text-2xl font-light text-gray-800 mb-2">Upload Individual Faces</h2>
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
          Upload a face for each selected GIF ({Object.keys(faceMapping).length}/{selectedGifs.length} uploaded)
        </p>
        <div className="flex justify-center">
          <MotionButton
            onClick={onBack}
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
            Back to mode selection
          </MotionButton>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 max-w-6xl mx-auto px-4 sm:px-6">
        <AnimatePresence>
          {selectedGifs.map((gifUrl, index) => {
            const state = uploadStates[gifUrl];
            const hasUploadedFace = !!faceMapping[gifUrl];
            
            return (
              <motion.div
                key={gifUrl}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="relative"
              >
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="aspect-square relative bg-gray-100">
                    <img
                      src={gifUrl}
                      alt={`GIF ${index + 1}`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    {hasUploadedFace && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"
                      >
                        <div className="bg-white rounded-full p-2">
                          <svg
                            className="w-6 h-6 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="p-2 sm:p-3">
                    <motion.div
                      className={`border-2 border-dashed rounded-lg p-3 sm:p-4 text-center transition-all ${
                        state.isDragging ? 'border-black bg-gray-100' : 'border-gray-300 bg-white'
                      }`}
                      onDragOver={(e) => handleDragOver(e, gifUrl)}
                      onDragLeave={(e) => handleDragLeave(e, gifUrl)}
                      onDrop={(e) => handleDrop(e, gifUrl)}
                      animate={{
                        scale: state.isDragging ? 1.02 : 1,
                        borderColor: state.isDragging ? '#000' : '#d1d5db',
                      }}
                      transition={springConfig}
                    >
                      <AnimatePresence mode="wait">
                        {state.isUploading ? (
                          <motion.div
                            key="uploading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="py-2"
                          >
                            <motion.div 
                              className="w-8 h-8 border-2 border-black border-t-transparent rounded-full mx-auto"
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "linear"
                              }}
                            />
                          </motion.div>
                        ) : state.preview ? (
                          <motion.div
                            key="preview"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={springConfig}
                            className="relative"
                          >
                            <img
                              src={state.preview}
                              alt="Face preview"
                              className="w-20 h-20 mx-auto rounded-lg object-cover"
                            />
                            <motion.button
                              onClick={() => fileInputRefs.current[gifUrl]?.click()}
                              className="mt-2 text-xs text-gray-600 hover:text-gray-800 underline"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Change
                            </motion.button>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="upload"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <motion.svg
                              className="w-8 h-8 mx-auto text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              animate={{
                                y: state.isDragging ? -2 : 0,
                              }}
                              transition={springConfig}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                            </motion.svg>
                            <input
                              ref={(el) => {
                                if (el) fileInputRefs.current[gifUrl] = el;
                              }}
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileInput(e, gifUrl)}
                              className="hidden"
                            />
                            <motion.button
                              onClick={() => fileInputRefs.current[gifUrl]?.click()}
                              className="mt-2 text-xs bg-black hover:bg-gray-800 text-white font-light py-1 px-3 rounded-sm transition-colors cursor-pointer"
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              Upload Face
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <motion.div 
        className="text-center mt-6 sm:mt-8 px-4 sm:px-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: allFacesUploaded ? 1 : 0.5, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <MotionButton
          onClick={handleProceed}
          disabled={!allFacesUploaded}
          variant="primary"
          size="md"
        >
          Process All Face Swaps
        </MotionButton>
      </motion.div>
    </motion.div>
  );
}