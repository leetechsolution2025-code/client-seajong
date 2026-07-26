"use client";
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface HoverImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  previewSize?: number;
  images?: string[];
}

export function HoverImage({ previewSize = 300, images, ...props }: HoverImageProps) {
  const [hover, setHover] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDisplaySrc(null); // Reset when props.src changes
  }, [props.src]);

  const imageList = images && images.length > 0 ? images : [props.src || ""];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (hover && imageList.length > 1) {
      interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % imageList.length);
      }, 1500);
    } else {
      setCurrentIndex(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [hover, imageList.length]);

  const handleMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    if (!hover) {
      const rect = imgRef.current?.getBoundingClientRect();
      if (rect) {
        // Calculate optimal position (right side of the thumbnail, or left if not enough space)
        let x = rect.right + 15;
        let y = rect.top - (previewSize / 2) + (rect.height / 2);
        
        // Adjust if it goes out of the right edge
        if (x + previewSize > window.innerWidth) {
          x = rect.left - previewSize - 15;
        }
        
        // Adjust if it goes out of the top or bottom edges
        if (y < 10) y = 10;
        if (y + previewSize > window.innerHeight - 10) {
          y = window.innerHeight - previewSize - 10;
        }

        setCoords({ x, y });
      }
      setHover(true);
    }
  };

  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => {
      setHover(false);
    }, 150);
  };

  const handleImageClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const selectedSrc = imageList[currentIndex];
    setDisplaySrc(typeof selectedSrc === 'string' ? selectedSrc : String(selectedSrc));
    setHover(false);
  };

  return (
    <>
      <img
        {...props}
        src={displaySrc || props.src}
        ref={imgRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      {hover && mounted && typeof document !== "undefined" && createPortal(
        <div 
          style={{
            position: "fixed",
            top: coords.y,
            left: coords.x,
            width: previewSize,
            height: previewSize,
            zIndex: 999999,
            borderRadius: 12,
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            backgroundColor: "#fff",
            border: "1px solid rgba(0,0,0,0.1)",
            pointerEvents: "auto",
            cursor: "pointer",
            animation: "fadeIn 0.2s ease-out"
          }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleImageClick}
        >
          {imageList.map((imgSrc, idx) => (
            <img 
              key={idx}
              src={imgSrc} 
              alt={props.alt || "Preview"} 
              style={{ 
                width: "100%", 
                height: "100%", 
                objectFit: "contain", 
                backgroundColor: "#f8f9fa",
                position: "absolute",
                top: 0,
                left: 0,
                opacity: currentIndex === idx ? 1 : 0,
                transition: "opacity 0.4s ease-in-out"
              }} 
            />
          ))}
          {imageList.length > 1 && (
            <div style={{
              position: "absolute",
              bottom: 12,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "center",
              gap: 4,
              zIndex: 10
            }}>
              {imageList.map((_, idx) => (
                <div key={idx} style={{
                  width: currentIndex === idx ? 12 : 6,
                  height: 6,
                  borderRadius: 99,
                  backgroundColor: currentIndex === idx ? "var(--primary, #3b82f6)" : "rgba(0,0,0,0.2)",
                  transition: "all 0.3s ease"
                }} />
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
