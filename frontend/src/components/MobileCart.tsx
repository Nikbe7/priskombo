"use client";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import API_URL from "@/lib/config";

export default function MobileCart() {
  // Använd global state istället för lokal isOpen
  const { basket, removeFromBasket, isCartOpen, setIsCartOpen } = useCart();
  const [optimizedResults, setOptimizedResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Om listan är tom och stängd, visa ingenting
  if (basket.length === 0 && !isCartOpen) return null;

  const optimizeBasket = async () => {
    if (basket.length === 0) return;
    setLoading(true);
    const productIds = basket.map(p => p.id);
    try {
      const res = await fetch(`${API_URL}/optimize`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_ids: productIds }),
      });
      const data = await res.json();
      setOptimizedResults(data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  return (
    <>
      {/* 1. FLYTANDE KNAPP (Syns bara om stängd och varor finns) */}
      {!isCartOpen && basket.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-50 lg:hidden animate-fade-in-up">
          <button 
            onClick={() => setIsCartOpen(true)} // Använd global setter
            className="w-full bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex justify-between items-center font-bold"
          >
            <span className="flex items-center gap-2"><span className="text-xl">📝</span> Visa listan</span>
            <span className="bg-white text-slate-900 px-3 py-1 rounded-full text-xs">
              {basket.length} st
            </span>
          </button>
        </div>
      )}

      {/* 2. OVERLAY (När isCartOpen är true) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          
          <div className="relative bg-white w-full rounded-t-3xl shadow-2xl max-h-[85vh] flex flex-col animate-fade-in-up">
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Din Inköpslista</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {basket.length === 0 ? <p className="text-center text-gray-400 py-10">Listan är tom</p> : null}
              
              {basket.map((p) => (
                <div key={p.id} className="flex gap-3 items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                   <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                      {p.image_url ? <img src={p.image_url} className="object-contain w-full h-full mix-blend-multiply"/> : "📦"}
                   </div>
                   <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-700 truncate">{p.name}</div>
                   </div>
                  <button onClick={() => removeFromBasket(p.id)} className="text-gray-400 p-2">✕</button>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-gray-100 bg-white pb-10">
              <button 
                onClick={optimizeBasket} 
                disabled={basket.length === 0 || loading} 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg"
              >
                {loading ? "Räknar..." : "Hitta bästa kombon 🚀"}
              </button>

              {optimizedResults.length > 0 && (
                <div className="mt-4 bg-green-50 p-4 rounded-xl border border-green-100">
                   <div className="flex justify-between items-center mb-1">
                     <span className="text-green-800 text-sm font-bold">Totalt</span>
                     <span className="text-2xl font-extrabold text-green-700">{optimizedResults[0].total_cost} kr</span>
                   </div>
                   <div className="text-xs text-green-600 font-medium mb-3">
                     ✅ {optimizedResults[0].type}
                   </div>
                    <div className="pt-3 border-t border-green-200/50 space-y-1">
                      {optimizedResults[0].details.map((d:any, i:number) => (
                          <div key={i} className="flex justify-between text-xs text-green-800/70">
                              <span>{d.store}</span>
                              <span className="font-mono">{d.products_cost + d.shipping} kr</span>
                          </div>
                      ))}
                    </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}