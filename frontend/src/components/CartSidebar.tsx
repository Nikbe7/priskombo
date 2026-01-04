"use client";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import API_URL from "@/lib/config";

export default function CartSidebar() {
  const {
    basket,
    removeFromBasket,
    updateQuantity,
    isCartOpen,
    setIsCartOpen,
  } = useCart();
  const [optimizedResults, setOptimizedResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  if (!isCartOpen) return null;

  const optimizeBasket = async () => {
    if (basket.length === 0) return;
    setLoading(true);
    const productIds = basket.flatMap((p) => Array(p.quantity).fill(p.id));
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
    <div className="hidden lg:block relative w-96 h-[calc(100vh-80px)] sticky top-24 mr-6 animate-fade-in-up">
      <aside className="w-full h-full bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Header med stäng-knapp */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            📝 Din Inköpslista{" "}
            <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
              {basket.length}
            </span>
          </h2>
          <button
            onClick={() => setIsCartOpen(false)}
            className="text-slate-400 hover:text-red-500 hover:bg-slate-100 p-1 rounded-full transition"
          >
            ✕
          </button>
        </div>

        {/* Produktlista */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {basket.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <span className="text-4xl opacity-50">📋</span>
              <p>Listan är tom</p>
            </div>
          ) : (
            basket.map((p) => {
              // Hitta lägsta pris för att visa
              const minPrice = Math.min(...p.prices.map((x) => x.price));

              return (
                <div
                  key={p.id}
                  className="flex gap-3 bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:border-blue-200 transition group relative"
                >
                  {/* Bild */}
                  <div className="w-16 h-16 bg-slate-50 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0 self-start">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        className="object-contain w-full h-full mix-blend-multiply"
                      />
                    ) : (
                      "📦"
                    )}
                  </div>

                  {/* Info & Controls */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-2">
                      <div className="text-sm font-semibold text-slate-700 leading-snug line-clamp-2">
                        {p.name}
                      </div>
                      <button
                        onClick={() => removeFromBasket(p.id)}
                        className="text-slate-300 hover:text-red-500 -mt-1 -mr-1"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex justify-between items-end mt-2">
                      {/* ANTAL KNAPPAR */}
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(p.id, -1)}
                          aria-label="Minska antal"
                          className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 hover:text-red-500 font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          −
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-slate-700">
                          {p.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(p.id, 1)}
                          aria-label="Öka antal"
                          className="w-6 h-6 flex items-center justify-center bg-white rounded shadow-sm text-slate-600 hover:text-blue-600 font-bold text-xs"
                        >
                          +
                        </button>
                      </div>

                      {/* Pris (Totalt för raden) */}
                      <div className="text-right">
                        <div className="text-sm font-bold text-slate-900">
                          {minPrice * p.quantity} kr
                        </div>
                        {p.quantity > 1 && (
                          <div className="text-[10px] text-slate-400">
                            à {minPrice} kr
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer / Action */}
        <div className="p-6 border-t border-slate-100 bg-white">
          <button
            onClick={optimizeBasket}
            disabled={basket.length === 0 || loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 transition-all active:scale-95"
          >
            {loading ? "Räknar ut bästa pris..." : "Hitta bästa kombon 🚀"}
          </button>

          {optimizedResults.length > 0 && (
            <div className="mt-4 bg-green-50 p-4 rounded-xl border border-green-100 animate-fade-in-up">
              <div className="flex justify-between items-center mb-1">
                <span className="text-green-800 text-sm font-bold">
                  Totalt pris
                </span>
                <span className="text-2xl font-extrabold text-green-700">
                  {optimizedResults[0].total_cost} kr
                </span>
              </div>
              <div className="text-xs text-green-600 font-medium mb-3 flex items-center gap-1">
                <span>✅</span> {optimizedResults[0].type}
              </div>
              <div className="pt-3 border-t border-green-200/50 space-y-1">
                {optimizedResults[0].details.map((d: any, i: number) => (
                  <div
                    key={i}
                    className="flex justify-between text-xs text-green-800/70"
                  >
                    <span>{d.store}</span>
                    <span className="font-mono">
                      {d.products_cost + d.shipping} kr
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
