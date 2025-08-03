import { useState, useRef, type DragEvent, type ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { springConfig } from './MotionTrackingProvider';

interface MotionImageUploadProps {
  onImageUpload: (imageData: string) => void;
}

export default function MotionImageUpload({ onImageUpload }: MotionImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFileInput = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFile(files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      if (data.success && data.base64Data) {
        setPreview(data.base64Data);
        setTimeout(() => {
          onImageUpload(data.base64Data);
        }, 500);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div 
      className="max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springConfig}
    >
      <motion.div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging ? 'border-black bg-gray-100' : 'border-gray-300 bg-white'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        animate={{
          scale: isDragging ? 1.02 : 1,
          borderColor: isDragging ? '#000' : '#d1d5db',
        }}
        transition={springConfig}
      >
        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-8"
            >
              <motion.div 
                className="w-12 h-12 border-2 border-black border-t-transparent rounded-full mx-auto"
                animate={{ rotate: 360 }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
              <p className="mt-4 text-gray-600">Uploading...</p>
            </motion.div>
          ) : preview ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={springConfig}
            >
              <img
                src={preview}
                alt="Preview"
                className="max-w-full h-auto mx-auto rounded-lg mb-4 max-h-64"
              />
              <motion.p 
                className="text-green-600 font-medium"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                Perfect! Processing your face swap...
              </motion.p>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.svg
                className="w-16 h-16 mx-auto text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                animate={{
                  y: isDragging ? -5 : 0,
                }}
                transition={springConfig}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </motion.svg>
              <p className="mt-4 text-gray-600">
                Drag and drop your photo here, or click to browse
              </p>
              <p className="mt-2 text-sm text-gray-500">
                JPG, PNG, GIF up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInput}
                className="hidden"
              />
              <motion.button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 bg-black hover:bg-gray-800 text-white font-light py-2 px-6 rounded-sm transition-colors cursor-pointer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Choose Photo
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}