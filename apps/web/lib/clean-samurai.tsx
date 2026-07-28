"use client";

import React, { useState, useEffect } from "react";

/* ═══════════════════════════════════════════
   DYNAMIC TRANSPARENT PNG HOOK & COMPONENTS
   Strips white / light-grey checkerboard and background
   pixels from PNG images dynamically using HTML5 Canvas.
   ═══════════════════════════════════════════ */

const imageCache: Record<string, string> = {};

export function useCleanImageSrc(originalPath: string): string {
  const [src, setSrc] = useState<string>(
    imageCache[originalPath] || originalPath
  );

  useEffect(() => {
    if (imageCache[originalPath]) {
      setSrc(imageCache[originalPath]);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = originalPath;
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const width = canvas.width;
        const height = canvas.height;

        // Sample corner colors
        const cornerIndices = [
          0,
          (width - 1) * 4,
          (height - 1) * width * 4,
          (height * width - 1) * 4,
        ];
        const corners = cornerIndices.map((idx) => [
          data[idx],
          data[idx + 1],
          data[idx + 2],
        ]);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
          const isGrayscale = maxDiff <= 25;
          const isLight = r > 165 && g > 165 && b > 165;
          const isSkin = r > g + 15 && g > b + 5 && r > 130;

          let isCornerMatch = false;
          for (const [cr, cg, cb] of corners) {
            const dist = Math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2);
            if (dist < 45) {
              isCornerMatch = true;
              break;
            }
          }

          if ((isLight && isGrayscale && !isSkin) || isCornerMatch || (r > 240 && g > 240 && b > 240)) {
            data[i + 3] = 0; // Set Alpha to transparent
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        imageCache[originalPath] = dataUrl;
        setSrc(dataUrl);
      } catch {
        // Fallback to original path if CORS or canvas error occurs
      }
    };
  }, [originalPath]);

  return src;
}

/* ═══════════════════════════════════════════
   CHARACTER SPECIFIC COMPONENTS
   - CleanNarratorImg: c1a2f0fe-2cda-4de1-a94e-305705229ea3.png (Narrator Sensei)
   - CleanMasterImg: ec32cb93-5408-46f4-8f4e-d47f2e09b640.png (Master AI Mentor)
   ═══════════════════════════════════════════ */

export function CleanNarratorImg({
  alt = "Narrator Sensei",
  className = "",
}: {
  alt?: string;
  className?: string;
}) {
  const cleanSrc = useCleanImageSrc("/png/c1a2f0fe-2cda-4de1-a94e-305705229ea3.png");
  return (
    <img
      src={cleanSrc}
      alt={alt}
      suppressHydrationWarning
      className={className}
    />
  );
}

export function CleanMasterImg({
  alt = "Master Mentor",
  className = "",
}: {
  alt?: string;
  className?: string;
}) {
  const cleanSrc = useCleanImageSrc("/png/ec32cb93-5408-46f4-8f4e-d47f2e09b640.png");
  return (
    <img
      src={cleanSrc}
      alt={alt}
      suppressHydrationWarning
      className={className}
    />
  );
}

export function CleanSamuraiImg({
  alt = "Samurai",
  className = "",
}: {
  alt?: string;
  className?: string;
}) {
  const cleanSrc = useCleanImageSrc("/png/samurai-png-11553980134hdueus36j0.png");
  return (
    <img
      src={cleanSrc}
      alt={alt}
      suppressHydrationWarning
      className={className}
    />
  );
}

export function useCleanSamuraiSrc(): string {
  return useCleanImageSrc("/png/samurai-png-11553980134hdueus36j0.png");
}
