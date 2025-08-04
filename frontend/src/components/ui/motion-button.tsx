import { motion, type HTMLMotionProps } from 'framer-motion';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils';

interface MotionButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const MotionButton = forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const variants = {
      primary: 'bg-black hover:bg-gray-800 text-white',
      secondary: 'bg-white hover:bg-gray-100 text-black border border-gray-300',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-700',
    };

    const sizes = {
      sm: 'py-2 px-3 text-xs sm:py-1 sm:text-sm min-h-[44px] sm:min-h-0',
      md: 'py-2.5 px-4 text-sm sm:py-2 min-h-[44px] sm:min-h-0',
      lg: 'py-3 px-5 text-sm sm:px-6 sm:text-base min-h-[44px]',
    };

    return (
      <motion.button
        ref={ref}
        className={cn(
          'font-light rounded-sm transition-colors cursor-pointer inline-flex items-center justify-center',
          variants[variant],
          sizes[size],
          className
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
        }}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

MotionButton.displayName = 'MotionButton';