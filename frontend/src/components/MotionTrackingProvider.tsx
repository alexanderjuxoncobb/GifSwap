import { AnimatePresence } from 'framer-motion';
import { createContext, useContext, useState, type ReactNode } from 'react';

interface MotionTrackingContextType {
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  dragOffset: { x: number; y: number };
  setDragOffset: (offset: { x: number; y: number }) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}

const MotionTrackingContext = createContext<MotionTrackingContextType | undefined>(undefined);

export const useMotionTracking = () => {
  const context = useContext(MotionTrackingContext);
  if (!context) {
    throw new Error('useMotionTracking must be used within a MotionTrackingProvider');
  }
  return context;
};

interface MotionTrackingProviderProps {
  children: ReactNode;
}

export const MotionTrackingProvider = ({ children }: MotionTrackingProviderProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const value = {
    currentIndex,
    setCurrentIndex,
    dragOffset,
    setDragOffset,
    isDragging,
    setIsDragging,
  };

  return (
    <MotionTrackingContext.Provider value={value}>
      <AnimatePresence mode="wait">
        {children}
      </AnimatePresence>
    </MotionTrackingContext.Provider>
  );
};

export const springConfig = {
  type: "spring" as const,
  damping: 25,
  stiffness: 300,
};

export const swipeConfig = {
  swipeBoundary: 50,
  swipeVelocityThreshold: 500,
};