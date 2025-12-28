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

  // Fallback-bild (Spara en grå ruta eller logga som /public/placeholder.png)
  const placeholderImage = "/placeholder.png"; 

  // 1. Om ingen URL finns, visa placeholder direkt
  if (!src) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center text-gray-400 ${className}`}>
        No Image
      </div>
    );
  }

  // 2. Använd wsrv.nl för att cacha och proxya bilden
  // Detta kringgår hotlink-skydd och gör bilden snabbare
  // Vi lägger till &w=800&q=80 för att optimera storlek och kvalitet
  const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=800&output=webp`;

  // 3. Om proxyn misslyckas (bilden finns inte hos butiken), visa placeholder
  if (error) {
    return (
       <div className={`bg-gray-100 flex items-center justify-center text-gray-400 text-xs text-center p-2 ${className}`}>
        <span>Bild saknas</span>
      </div>
    );
  }

  return (
    <Image
      src={proxyUrl}
      alt={alt}
      className={className}
      fill={fill}
      width={width}
      height={height}
      // "cover" gör att bilden fyller rutan snyggt utan att sträckas
      style={fill ? { objectFit: "contain" } : undefined} 
      onError={() => setError(true)}
      unoptimized // Vi låter wsrv.nl sköta optimeringen för att spara Vercel-bandbredd
    />
  );
}