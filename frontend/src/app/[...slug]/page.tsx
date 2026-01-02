"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import API_URL from "@/lib/config";

// Importera vyerna
import ProductView from "@/components/views/ProductView";
import CategoryView from "@/components/views/CategoryView";

export default function CatchAllPage() {
  const params = useParams();
  
  // Hämta sista delen av URL:en (t.ex. "sony-wh-1000xm5" från "ljud/horlurar/sony-wh-1000xm5")
  const slugPath = params.slug as string[];
  const currentSlug = slugPath[slugPath.length - 1];

  const [viewType, setViewType] = useState<"loading" | "product" | "category">("loading");
  const [productData, setProductData] = useState<any>(null);

  useEffect(() => {
    if (!currentSlug) return;

    const checkContentType = async () => {
      setViewType("loading");
      
      try {
        // 1. Försök hämta som PRODUKT först
        const res = await fetch(`${API_URL}/products/${currentSlug}`);
        
        if (res.ok) {
          const data = await res.json();
          setProductData(data);
          setViewType("product");
        } else {
          // 2. Om 404, anta att det är en KATEGORI
          // Vi låter CategoryView sköta sin egen hämtning/logik precis som förut
          // för att inte krångla till det, så vi byter bara vy.
          setViewType("category");
        }
      } catch (err) {
        console.error("Fel vid routing:", err);
        // Fallback till kategori vid nätverksfel eller annat
        setViewType("category");
      }
    };

    checkContentType();
  }, [currentSlug]);

  if (viewType === "loading") {
    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin text-4xl">⏳</div>
        </div>
    );
  }

  if (viewType === "product" && productData) {
    return <ProductView product={productData} />;
  }

  // Fallback: Visa kategori-vyn (Din gamla DynamicCategoryPage)
  // Den kommer hantera om kategorin inte heller finns (visar "Kategorin hittades inte")
  return <CategoryView />;
}