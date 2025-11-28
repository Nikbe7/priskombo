"use client";
import { useState } from "react";
import { useCart } from "@/context/CartContext"; // Importera vår nya hook
import API_URL from "@/lib/config";

export default function CartSidebar() {
  const { basket, removeFromBasket } = useCart(); // Hämta global state
  const [optimizedResults, setOptimizedResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const optimizeBasket = async () => {
    if (basket.length === 0) return;
    setLoading(true);
    
    const productIds = basket.map(p => p.id);
    try {
      const res = await fetch(`${API_URL}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_ids: productIds }),
      });
      const data = await res.json();
      setOptimizedResults(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="w-96 bg-white border-l border-gray-200 p-6 flex flex-col h-screen sticky top-0 shadow-xl z-20">
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        🛒 Din Varukorg ({basket.length})
      </h2>
      
      <div className="flex-1 overflow-y-auto mb-6 space-y-3 pr-2">
        {basket.length === 0 ? (
          <p className="text-gray-400 text-center mt-10">Korgen är tom</p>
        ) : null}
        
        {basket.map((p) => (
          <div key={p.id} className="flex gap-3 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
             {/* Liten bild i korgen */}
             <div className="w-8 h-8 bg-white rounded border flex items-center justify-center overflow-hidden">
                {p.image_url ? <img src={p.image_url} className="object-contain w-full h-full"/> : "📦"}
             </div>
             <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{p.name}</div>
             </div>
            <button 
              onClick={() => removeFromBasket(p.id)} 
              className="text-gray-400 hover:text-red-500 px-2"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button 
        onClick={optimizeBasket} 
        disabled={basket.length === 0 || loading} 
        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition shadow-lg"
      >
        {loading ? "Räknar..." : "Hitta billigaste 🚀"}
      </button>

      {optimizedResults.length > 0 && (
        <div className="mt-6 bg-blue-50 p-5 rounded-xl border border-blue-200 animate-fade-in-up">
           <div className="font-bold text-xl text-blue-700">{optimizedResults[0].total_cost} kr</div>
           <div className="text-sm text-gray-600 font-medium">{optimizedResults[0].type}</div>
            <div className="mt-3 pt-3 border-t border-blue-200 text-xs text-gray-500">
              {optimizedResults[0].details.map((d:any, i:number) => (
                  <div key={i} className="flex justify-between mb-1">
                      <span>{d.store}</span>
                      <span>{d.products_cost + d.shipping} kr</span>
                  </div>
              ))}
            </div>
        </div>
      )}
    </aside>
  );
}