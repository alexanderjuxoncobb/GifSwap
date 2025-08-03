import { type Ref, forwardRef, useState, useEffect } from "react";
import { motion, useMotionValue } from "framer-motion";

import { cn } from "@/lib/utils";

export const PhotoGallery = ({
  animationDelay = 0.5,
  onMemeSelect,
  selectedMemes = [],
}: {
  animationDelay?: number;
  onMemeSelect?: (memeUrl: string) => void;
  selectedMemes?: string[];
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // First make the container visible with a fade-in
    const visibilityTimer = setTimeout(() => {
      setIsVisible(true);
    }, animationDelay * 1000);

    // Then start the photo animations after a short delay
    const animationTimer = setTimeout(() => {
      setIsLoaded(true);
    }, (animationDelay + 0.4) * 1000); // Add 0.4s for the opacity transition

    return () => {
      clearTimeout(visibilityTimer);
      clearTimeout(animationTimer);
    };
  }, [animationDelay]);

  // Animation variants for the container
  const containerVariants = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1, // Reduced from 0.3 to 0.1 since we already have the fade-in delay
      },
    },
  };

  // Animation variants for each photo
  const photoVariants = {
    hidden: () => ({
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
      // Keep the same z-index throughout animation
    }),
    visible: (custom: { x: any; y: any; order: number }) => ({
      x: custom.x,
      y: custom.y,
      rotate: 0, // No rotation
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 70,
        damping: 12,
        mass: 1,
        delay: custom.order * 0.15, // Explicit delay based on order
      },
    }),
  };

  // All memes from the original collection arranged in a grid layout
  const allMemes = [
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExcHZhN2xtZGRtZ3ZsNmhqdHl3amF1b24yM2RyOGpwMG1xaHYxZnVnZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/kaq6GnxDlJaBq/giphy.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExenRhN3U0ZXNnbmZqc2ZoYXJuOGFrZnJ1eTY3OXBhd2czNXoxczdtdyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/geEvRnbQqLYsb5WOr8/giphy.gif",
    "https://media.giphy.com/media/bWM2eWYfN3r20/giphy.gif",
    "https://media.giphy.com/media/6pJNYBYSMFod2/giphy.gif",
    "https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif",
    "https://media.giphy.com/media/13n7XeyIXEIrbG/giphy.gif",
    "https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif",
    "https://media.giphy.com/media/UO5elnTqo4vSg/giphy.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNDZ0cWJvNzk1cmEwMmhwNzdmdDhkdnNob2FqYjVhcTU0YTMzejEweSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xL7PDV9frcudO/giphy.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcTVyMXV1aGJ2OXp6Z2hhbmNsYnh0dnB5NmJndGU0NWJrMHl4NzQ5ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/cF7QqO5DYdft6/giphy.gif",
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExamt1YmpiNzgzbG53eGhrZ3FnaTZycnY2cWs1ZTM0cnczZHVoM20wcyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/11ISwbgCxEzMyY/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbnplaHczMW5obms0NDI1ZXJ2dWx1Yml4NmprNWlremhvazU5amRxdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/GpsHIJ4IBN7sn28ieH/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExOXRkY204OGhsNHdyYjAyazdrbGw3aXFkNnMyZGRrYW11OXFkd2lxNCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/BPJmthQ3YRwD6QqcVD/giphy.gif",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzE0Z280N2NweWNqcTg4a3k2bnF1bDYxcGQxODN6cnNkZWkyNnoweSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/cXblnKXr2BQOaYnTni/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbjV3azJ3YzZyM282YXc5eXo5eDR2NXJheW44dHdwMzViaGFodG1payZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/CycIvRahkUp0Y/giphy.gif",
  ];

  // Generate consistent grid positions for all memes
  const photos = allMemes.map((src, index) => {
    const row = Math.floor(index / 5);
    const col = index % 5;
    // Create a consistent grid layout
    const baseX = (col - 2) * 260; // Center around 0, consistent spacing
    const baseY = row * 240; // Rows with more vertical spacing

    return {
      id: index + 1,
      order: index,
      x: `${baseX}px`,
      y: `${baseY}px`,
      zIndex: 50 - index, // Descending z-index
      direction: (index % 2 === 0 ? "left" : "right") as Direction,
      src: src,
    };
  });

  const handleMemeClick = (memeUrl: string) => {
    if (onMemeSelect) {
      onMemeSelect(memeUrl);
    }
  };

  return (
    <div className="mt-8 pb-8 relative">
      <h3 className="z-20 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-center text-4xl text-transparent dark:bg-gradient-to-r dark:from-slate-100 dark:via-slate-200 dark:to-slate-100 dark:bg-clip-text md:text-6xl font-bold mb-6">
        GifSwap
      </h3>
      <p className="lg:text-md mb-8 text-center text-xs font-light uppercase tracking-widest text-slate-600 dark:text-slate-400">
        Choose from below (can select multiple)
      </p>
      <div className="relative mb-8 h-[720px] w-full items-center justify-center flex z-0">
        <motion.div
          className="relative mx-auto flex w-full max-w-7xl justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <motion.div
            className="relative flex w-full justify-center"
            variants={containerVariants}
            initial="hidden"
            animate={isLoaded ? "visible" : "hidden"}
          >
            <div className="relative h-[720px] w-[1300px]">
              {/* Render photos in reverse order so that higher z-index photos are rendered later in the DOM */}
              {[...photos].reverse().map((photo) => (
                <motion.div
                  key={photo.id}
                  className="absolute left-1/2 top-0 -translate-x-1/2"
                  style={{ zIndex: Math.min(photo.zIndex, 10) }}
                  variants={photoVariants}
                  custom={{
                    x: photo.x,
                    y: photo.y,
                    order: photo.order,
                  }}
                >
                  <Photo
                    width={220}
                    height={220}
                    src={photo.src}
                    alt="Meme"
                    direction={photo.direction}
                    onClick={() => handleMemeClick(photo.src)}
                    isSelected={selectedMemes.includes(photo.src)}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

function getRandomNumberInRange(min: number, max: number): number {
  if (min >= max) {
    throw new Error("Min value should be less than max value");
  }
  return Math.random() * (max - min) + min;
}

const MotionImage = motion.create(
  forwardRef(function MotionImage(
    props: React.ImgHTMLAttributes<HTMLImageElement>,
    ref: Ref<HTMLImageElement>
  ) {
    return <img ref={ref} {...props} />;
  })
);

type Direction = "left" | "right";

export const Photo = ({
  src,
  alt,
  className,
  direction,
  width,
  height,
  onClick,
  isSelected = false,
  ...props
}: {
  src: string;
  alt: string;
  className?: string;
  direction?: Direction;
  width: number;
  height: number;
  onClick?: () => void;
  isSelected?: boolean;
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const x = useMotionValue(200);
  const y = useMotionValue(200);

  useEffect(() => {
    const randomRotation =
      getRandomNumberInRange(0.5, 2) * (direction === "left" ? -1 : 1);
    setRotation(randomRotation);
  }, []);

  function handleMouse(event: {
    currentTarget: { getBoundingClientRect: () => any };
    clientX: number;
    clientY: number;
  }) {
    const rect = event.currentTarget.getBoundingClientRect();
    x.set(event.clientX - rect.left);
    y.set(event.clientY - rect.top);
  }

  const resetMouse = () => {
    x.set(200);
    y.set(200);
  };

  return (
    <motion.div
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      whileTap={{ scale: 1.2, zIndex: 20 }}
      whileHover={{
        scale: isSelected ? 0.95 : 1.1,
        rotateZ: rotation + 2 * (direction === "left" ? -1 : 1),
        zIndex: 20,
      }}
      whileDrag={{
        scale: 1.1,
        zIndex: 20,
      }}
      initial={{
        rotate: rotation,
        scale: isSelected ? 0.9 : 1,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 20,
        mass: 0.5,
      }}
      style={{
        width,
        height,
        perspective: 400,
        transform: `rotate(0deg) rotateX(0deg) rotateY(0deg)`,
        zIndex: 1,
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
        touchAction: "none",
      }}
      className={cn(className, "relative mx-auto shrink-0 cursor-pointer")}
      onMouseMove={handleMouse}
      onMouseLeave={resetMouse}
      onClick={onClick}
      draggable={false}
      tabIndex={0}
    >
      <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-sm">
        <MotionImage
          className={cn("rounded-3xl object-cover w-full h-full")}
          src={src}
          alt={alt}
          {...props}
          draggable={false}
        />
        <div className="absolute top-3 left-3">
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer ${
              isSelected
                ? "bg-black border-black text-white"
                : "bg-white border-gray-300 hover:border-gray-400"
            }`}
          >
            {isSelected && (
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
