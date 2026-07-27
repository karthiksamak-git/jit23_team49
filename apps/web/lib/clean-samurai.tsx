"use client";

import React, { useState, useEffect } from "react";

/* ═══════════════════════════════════════════
   CLEAN SAMURAI PNG PROVIDER & HOOK
   Drives instant, transparent rendering of the samurai
   character by removing fake white/grey checkerboard backgrounds.
   Caches the result so processing happens only once!
   ═══════════════════════════════════════════ */

let cachedTransparentUrl: string | null = null;

export function useCleanSamuraiSrc(): string {
  const [src, setSrc] = useState<string>(
    cachedTransparentUrl || "/png/samurai-png-11553980134hdueus36j0.png"
  );

  useEffect(() => {
    if (cachedTransparentUrl) {
      setSrc(cachedTransparentUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "/png/samurai-png-11553980134hdueus36j0.png";
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

        // Loop through pixels and convert white/light-grey checkerboard pixels to transparent
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
          const isGrayscale = maxDiff <= 15;
          const isLight = r > 150 && g > 150 && b > 150;
          const isSkin = r > g + 15 && g > b + 5;

          if (isLight && isGrayscale && !isSkin) {
            data[i + 3] = 0; // Alpha = 0 (Transparent)
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        cachedTransparentUrl = dataUrl;
        setSrc(dataUrl);
      } catch {
        // Fallback to original
      }
    };
  }, []);

  return src;
}

export function CleanSamuraiImg({
  alt = "Samurai",
  className = "",
}: {
  alt?: string;
  className?: string;
}) {
  const cleanSrc = useCleanSamuraiSrc();
  return (
    <img
      src={cleanSrc}
      alt={alt}
      suppressHydrationWarning
      className={className}
    />
  );
}
