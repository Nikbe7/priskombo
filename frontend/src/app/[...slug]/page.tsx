"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchProductBySlug } from "@/services/products";

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
        const data = await fetchProductBySlug(currentSlug);
        
        if (data) {
          setProductData(data);
          setViewType("product");
        } else {
          setViewType("category");
        }
      } catch (err) {
        console.error("Fel vid routing:", err);
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