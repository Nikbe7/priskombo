"use client";
import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import ProductImage from "@/components/ProductImage"; 

// Typer som matchar din nya backend-respons
type CategoryLink = {
  name: string;
  slug: string;
  parent?: CategoryLink | null;
};

type ProductDetails = {
  id: number;
  name: string;
  ean: string;
  slug: string | null;
  image_url: string | null;
  // Category är nu ett objekt, inte bara en sträng
  category: CategoryLink | null;
  prices: { 
    store: string; 
    price: number; 
    regular_price?: number;
    discount_percent?: number;
    url: string; 
    base_shipping: number;
  }[];
};

export default function ProductView({ product }: { product: ProductDetails }) {
  const { addToBasket } = useCart();
  const bestPrice = product.prices[0]?.price || 0;

  // Enkel funktion för att rendera brödsmulor rekursivt (Parent -> Child)
  const renderBreadcrumbs = (cat: CategoryLink | null | undefined) => {
    if (!cat) return null;
    return (
      <>
        {cat.parent && renderBreadcrumbs(cat.parent)}
        <Link href={`/${cat.slug}`} className="hover:text-blue-600 hover:underline capitalize">
           {cat.name}
        </Link>
        <span className="mx-2 text-gray-400">/</span>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-12 font-sans pb-32 pt-24">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        
        <div className="grid grid-cols-1 md:grid-cols-2">
          
          {/* BILD */}
          <div className="bg-gray-50 p-10 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 relative">
             <Link href="/" className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition text-sm font-medium">
               ← Tillbaka
             </Link>
             {product.image_url ? (
                <div className="relative w-full h-80">
                   {/* Använd vanlig img om du inte vill bråka med Next Image just nu */}
                   <img 
                     src={product.image_url} 
                     alt={product.name} 
                     className="w-full h-full object-contain mix-blend-multiply" 
                   />
                </div>
             ) : (
                <span className="text-6xl">📦</span>
             )}
          </div>

          {/* INFO */}
          <div className="p-8 md:p-12 flex flex-col justify-center">
            
            {/* Brödsmulor (Breadcrumbs) */}
            <div className="text-xs text-gray-500 mb-4 flex flex-wrap items-center">
                <Link href="/" className="hover:text-blue-600 hover:underline">Start</Link>
                <span className="mx-2 text-gray-400">/</span>
                {product.category ? renderBreadcrumbs(product.category) : <span>Okategoriserad</span>}
            </div>

            <h1 className="text-3xl font-extrabold text-gray-900 mb-4 leading-tight">{product.name}</h1>
            
            <div className="flex items-center gap-4 mb-8">
              <span className="text-4xl font-extrabold text-gray-900">{bestPrice} kr</span>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                Jämför {product.prices.length} butiker
              </span>
            </div>

            <button 
              onClick={() => addToBasket({
                  id: product.id, name: product.name, ean: product.ean, image_url: product.image_url, 
                  prices: product.prices
              } as any)}
              className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-200 mb-6"
            >
              Lägg i varukorg
            </button>
            
            <div className="text-xs text-gray-400">
              EAN: {product.ean}
            </div>
          </div>
        </div>

        {/* PRISLISTA */}
        <div className="p-8 bg-gray-50 border-t border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4 text-lg">Jämför alla butiker ({product.prices.length})</h3>
          <div className="space-y-3">
            {product.prices.map((offer, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 border rounded-lg hover:border-blue-300 transition bg-white relative overflow-hidden group">
                
                <div className="flex items-center gap-3 relative z-10">
                  <span className="font-bold text-gray-700">{offer.store}</span>
                  {idx === 0 && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold">Billigast</span>}
                  
                  {/* Rea-etikett */}
                  {offer.discount_percent && offer.discount_percent > 0 ? (
                    <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded font-bold animate-pulse">
                      -{offer.discount_percent}%
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-4 relative z-10">
                  <div className="text-right">
                    <div className="font-bold text-lg text-gray-900">{offer.price} kr</div>
                    
                    {offer.regular_price && offer.regular_price > offer.price && (
                      <div className="text-xs text-gray-400 line-through">
                        {offer.regular_price} kr
                      </div>
                    )}

                    <div className="text-xs text-gray-400">
                      {offer.base_shipping !== undefined 
                        ? (offer.base_shipping === 0 ? "Fri frakt" : `+ ${offer.base_shipping} kr frakt`) 
                        : ""}
                    </div>
                  </div>
                  
                  <a href={offer.url} target="_blank" className="text-blue-600 font-medium hover:underline text-sm px-3 py-1 bg-blue-50 rounded hover:bg-blue-100 transition">
                    Till butik →
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}