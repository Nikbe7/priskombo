"use client";

import Image from "next/image";
import { useState } from "react";

interface ProductImageProps {
  src: string | null;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}

export default function ProductImage({
  src,
  alt,
  className,
  fill,
  width,
  height,
}: ProductImageProps) {
  const [error, setError] = useState(false);

  // Logik för dimensioner (samma fix som sist för att undvika krasch)
  const isFill = fill === true;
  const defaultSize = 800; 
  const finalWidth = !isFill && !width ? defaultSize : width;
  const finalHeight = !isFill && !height ? defaultSize : height;

  // --- LOGIK FÖR ATT VISA PLACEHOLDER ---
  // Om vi inte har någon URL (src är null/tom) ELLER om vi fått fel vid laddning
  if (!src || error) {
    return (
      <Image
        src="/placeholder.png" // Hämtar automatiskt från public/placeholder.png
        alt="Bild saknas"
        className={`opacity-50 grayscale ${className}`} // Lite styling så man fattar att det är en placeholder
        fill={isFill}
        width={isFill ? undefined : finalWidth}
        height={isFill ? undefined : finalHeight}
        style={{ objectFit: "contain", padding: "10px" }}
      />
    );
  }

  // --- LOGIK FÖR RIKTIG BILD ---
  // Använd proxyn
  const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=800&output=webp`;

  return (
    <Image
      src={proxyUrl}
      alt={alt}
      className={className}
      fill={isFill}
      width={isFill ? undefined : finalWidth}
      height={isFill ? undefined : finalHeight}
      style={{ objectFit: "contain" }}
      onError={() => setError(true)} // Om den riktiga bilden misslyckas, sätt error=true -> visa placeholder
      unoptimized
    />
  );
}
