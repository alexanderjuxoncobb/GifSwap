import { type Ref, forwardRef, useState, useEffect, useRef } from "react";
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
  const [photoSize, setPhotoSize] = useState(220);
  const galleryContainerRef = useRef<HTMLDivElement>(null);
  const isUpdatingSelection = useRef(false);

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

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        // Dynamic sizing for mobile: use ~35% of screen width for each GIF
        // This gives good spacing while maximizing GIF size
        const dynamicSize = Math.floor(width * 0.35);
        setPhotoSize(Math.max(100, Math.min(dynamicSize, 160))); // Min 100px, max 160px
      } else if (width < 1024) {
        setPhotoSize(180);
      } else {
        setPhotoSize(220);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    }),
    visible: (custom: { mobileX: any; mobileY: any; tabletX: any; tabletY: any; desktopX: any; desktopY: any; order: number }) => {
      // Determine position based on screen size
      if (typeof window !== 'undefined') {
        const width = window.innerWidth;
        let x, y;
        if (width < 640) {
          x = custom.mobileX;
          y = custom.mobileY;
        } else if (width < 1024) {
          x = custom.tabletX;
          y = custom.tabletY;
        } else {
          x = custom.desktopX;
          y = custom.desktopY;
        }
        return {
          x,
          y,
          rotate: 0,
          scale: 1,
          transition: {
            type: "spring" as const,
            stiffness: 70,
            damping: 12,
            mass: 1,
            delay: custom.order * 0.15,
          },
        };
      }
      return {
        x: custom.desktopX,
        y: custom.desktopY,
        rotate: 0,
        scale: 1,
        transition: {
          type: "spring" as const,
          stiffness: 70,
          damping: 12,
          mass: 1,
          delay: custom.order * 0.15,
        },
      };
    },
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

  // Check if we're in 2-column mode (mobile)
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Use only 14 GIFs for 2-column layout, all 15 for other layouts
  const displayMemes = isMobile ? allMemes.slice(0, 14) : allMemes;
  
  // Generate responsive grid positions for display memes
  const photos = displayMemes.map((src, index) => {
    // Mobile layout: 2 columns with dynamic sizing
    const mobileRow = Math.floor(index / 2);
    const mobileCol = index % 2;
    // Dynamic positioning based on current photo size
    const halfWidth = photoSize / 2;
    const gap = 20; // 20px gap between GIFs
    const halfGap = gap / 2;
    const distanceFromCenter = halfWidth + halfGap;
    const mobileX = mobileCol === 0 ? -distanceFromCenter : distanceFromCenter;
    const mobileY = mobileRow * (photoSize + 40);  // Dynamic vertical spacing based on size

    // Tablet layout: 3 columns with 30px gap (180px GIF size)
    const tabletRow = Math.floor(index / 3);
    const tabletCol = index % 3;
    // Position from center: center column at 0, left at -210px, right at +210px
    const tabletX = (tabletCol - 1) * 210;
    const tabletY = tabletRow * 240;

    // Desktop layout: 5 columns with 60px gap (220px GIF size)
    const desktopRow = Math.floor(index / 5);
    const desktopCol = index % 5;
    // Position from center: center column at 0, spread evenly left and right
    const desktopX = (desktopCol - 2) * 280;
    const desktopY = desktopRow * 260;

    return {
      id: index + 1,
      order: index,
      mobileX: `${mobileX}px`,
      mobileY: `${mobileY}px`,
      tabletX: `${tabletX}px`,
      tabletY: `${tabletY}px`,
      desktopX: `${desktopX}px`,
      desktopY: `${desktopY}px`,
      zIndex: 50 - index,
      direction: (index % 2 === 0 ? "left" : "right") as Direction,
      src: src,
    };
  });

  const handleMemeClick = (memeUrl: string) => {
    // Set flag to prevent scroll restoration side effects
    isUpdatingSelection.current = true;
    
    // Save current scroll positions
    const containerScroll = galleryContainerRef.current?.scrollTop || 0;
    const windowScroll = window.pageYOffset || document.documentElement.scrollTop;
    
    if (onMemeSelect) {
      onMemeSelect(memeUrl);
    }
    
    // Restore scroll positions immediately
    requestAnimationFrame(() => {
      if (galleryContainerRef.current) {
        galleryContainerRef.current.scrollTop = containerScroll;
      }
      window.scrollTo(0, windowScroll);
      
      // Reset flag after a short delay
      setTimeout(() => {
        isUpdatingSelection.current = false;
      }, 100);
    });
  };

  // Prevent scroll jump on selection change
  useEffect(() => {
    if (isUpdatingSelection.current) {
      return; // Skip if we're in the middle of updating selection
    }
    
    // This effect should only run on external updates, not our own clicks
    const handleScroll = (e: Event) => {
      if (isUpdatingSelection.current) {
        e.preventDefault();
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: false });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [selectedMemes]);

  return (
    <div className="mt-4 sm:mt-6 lg:mt-8 pb-4 sm:pb-6 lg:pb-8 relative">
      <h3 className="z-20 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-center text-2xl sm:text-3xl lg:text-4xl text-transparent dark:bg-gradient-to-r dark:from-slate-100 dark:via-slate-200 dark:to-slate-100 dark:bg-clip-text md:text-5xl xl:text-6xl font-bold mb-3 sm:mb-4 lg:mb-6">
        GifSwap
      </h3>
      <p className="text-xs sm:text-sm lg:text-md mb-4 sm:mb-6 lg:mb-8 text-center font-light uppercase tracking-widest text-slate-600 dark:text-slate-400">
        Choose from below (can select multiple)
      </p>
      {selectedMemes.length > 0 && (
        <p className="text-xs sm:text-sm mb-2 text-center font-medium text-slate-700 dark:text-slate-300">
          Selected: {selectedMemes.length} / 5
        </p>
      )}
      <div 
        ref={galleryContainerRef}
        className="relative mb-4 sm:mb-8 lg:mb-8 h-auto sm:min-h-[1000px] lg:min-h-[720px] w-full items-start sm:items-center justify-center flex z-0 overflow-visible"
      >
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
            <div className={`relative ${isMobile ? '' : 'sm:h-[1000px] lg:h-[720px]'} w-full sm:w-[900px] lg:w-[1300px] mb-20`} style={isMobile ? { height: `${Math.ceil(displayMemes.length / 2) * (photoSize + 40) + 100}px` } : {}}>
              {/* Render photos in reverse order so that higher z-index photos are rendered later in the DOM */}
              {[...photos].reverse().map((photo) => (
                <motion.div
                  key={photo.id}
                  className="absolute left-1/2 top-0 -translate-x-1/2"
                  style={{ zIndex: Math.min(photo.zIndex, 10) }}
                  variants={photoVariants}
                  custom={{
                    mobileX: photo.mobileX,
                    mobileY: photo.mobileY,
                    tabletX: photo.tabletX,
                    tabletY: photo.tabletY,
                    desktopX: photo.desktopX,
                    desktopY: photo.desktopY,
                    order: photo.order,
                  }}
                >
                  <Photo
                    width={photoSize}
                    height={photoSize}
                    src={photo.src}
                    alt="Meme"
                    direction={photo.direction}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMemeClick(photo.src);
                    }}
                    isSelected={selectedMemes.includes(photo.src)}
                    isDisabled={selectedMemes.length >= 5 && !selectedMemes.includes(photo.src)}
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
  isDisabled = false,
  ...props
}: {
  src: string;
  alt: string;
  className?: string;
  direction?: Direction;
  width: number;
  height: number;
  onClick?: (e: React.MouseEvent) => void;
  isSelected?: boolean;
  isDisabled?: boolean;
}) => {
  const [rotation, setRotation] = useState<number>(0);
  const x = useMotionValue(200);
  const y = useMotionValue(200);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const randomRotation =
      getRandomNumberInRange(0.5, 2) * (direction === "left" ? -1 : 1);
    setRotation(randomRotation);
    
    // Detect if device has touch capability
    const checkTouchDevice = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    };
    
    checkTouchDevice();
    // Re-check on resize in case of device orientation change
    window.addEventListener('resize', checkTouchDevice);
    return () => window.removeEventListener('resize', checkTouchDevice);
  }, [direction]);

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
      drag={!isDisabled && !isTouchDevice}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      whileTap={!isDisabled ? { scale: 1.2, zIndex: 20 } : {}}
      whileHover={!isDisabled && !isTouchDevice ? {
        scale: isSelected ? 0.95 : 1.1,
        rotateZ: rotation + 2 * (direction === "left" ? -1 : 1),
        zIndex: 20,
      } : {}}
      whileDrag={!isDisabled && !isTouchDevice ? {
        scale: 1.1,
        zIndex: 20,
      } : {}}
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
        touchAction: isTouchDevice ? "manipulation" : "none",
        opacity: isDisabled ? 0.5 : 1,
      }}
      className={cn(className, `relative mx-auto shrink-0 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`)}
      onMouseMove={!isDisabled ? handleMouse : undefined}
      onMouseLeave={!isDisabled ? resetMouse : undefined}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDisabled && onClick) onClick(e);
      }}
      draggable={false}
    >
      <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-sm">
        <MotionImage
          className={cn("rounded-3xl object-cover w-full h-full", isDisabled && "grayscale")}
          src={src}
          alt={alt}
          {...props}
          draggable={false}
        />
        <div className="absolute top-3 left-3">
          <div
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
              isSelected
                ? "bg-black border-black text-white"
                : isDisabled 
                  ? "bg-gray-200 border-gray-300 cursor-not-allowed"
                  : "bg-white border-gray-300 hover:border-gray-400 cursor-pointer"
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
