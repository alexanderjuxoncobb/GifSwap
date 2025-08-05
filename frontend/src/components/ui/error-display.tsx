import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ErrorInfo {
  type: string;
  title: string;
  message: string;
  action?: string;
}

interface ErrorDisplayProps {
  error: ErrorInfo | null;
  onClose: () => void;
}

const getErrorIcon = (errorType: string) => {
  switch (errorType) {
    case 'payment_required':
      return '💳';
    case 'auth_error':
      return '🔐';
    case 'rate_limit':
      return '⏱️';
    case 'network_error':
      return '🌐';
    case 'file_not_found':
      return '📁';
    case 'access_denied':
      return '🚫';
    case 'file_too_large':
      return '📏';
    case 'invalid_format':
      return '📂';
    case 'corrupted_file':
      return '💾';
    case 'memory_error':
      return '🧠';
    case 'animation_error':
      return '🎬';
    case 'timeout_error':
      return '⏰';
    case 'model_error':
      return '🤖';
    default:
      return '⚠️';
  }
};

const getErrorColor = (errorType: string) => {
  switch (errorType) {
    case 'payment_required':
      return 'from-yellow-500 to-orange-500';
    case 'auth_error':
      return 'from-red-500 to-pink-500';
    case 'rate_limit':
      return 'from-blue-500 to-indigo-500';
    case 'network_error':
      return 'from-purple-500 to-blue-500';
    case 'file_not_found':
    case 'access_denied':
      return 'from-red-500 to-rose-500';
    case 'file_too_large':
    case 'memory_error':
      return 'from-orange-500 to-red-500';
    case 'invalid_format':
    case 'corrupted_file':
      return 'from-amber-500 to-orange-500';
    case 'animation_error':
    case 'timeout_error':
      return 'from-indigo-500 to-purple-500';
    case 'model_error':
      return 'from-pink-500 to-red-500';
    default:
      return 'from-gray-500 to-gray-600';
  }
};

export default function ErrorDisplay({ error, onClose }: ErrorDisplayProps) {
  if (!error) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with gradient */}
          <div className={`bg-gradient-to-r ${getErrorColor(error.type)} p-6 text-white`}>
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{getErrorIcon(error.type)}</span>
              <div>
                <h3 className="text-xl font-bold">{error.title}</h3>
                <p className="text-white/80 text-sm capitalize">{error.type.replace('_', ' ')}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-700 leading-relaxed mb-4">{error.message}</p>
            
            {error.action && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-blue-800 text-sm font-medium">💡 Recommended Action:</p>
                <p className="text-blue-700 text-sm mt-1">{error.action}</p>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
            >
              {error.action ? 'Got it' : 'Dismiss'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
} 