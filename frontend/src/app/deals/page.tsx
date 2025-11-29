"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import API_URL from "@/lib/config";
import { useCart } from "@/context/CartContext";

export default function DealsPage() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToBasket } = useCart();

  useEffect(() => {
    fetch(`${API_URL}/deals?limit=100`)
      .then(res => res.json())
      .then(data => setDeals(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-20 text-center text-gray-500">Letar efter fynd... 🔥</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans pb-32">
      <div className="max-w-6xl mx-auto">
        
        <header className="mb-10 text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight mb-2">
            Super<span className="text-red-500">Deals</span> 🔥
          </h1>
          <p className="text-gray-500">Priserna som sänkts mest just nu.</p>
        </header>

        {deals.length === 0 ? (
          <div className="text-center p-10 bg-white rounded-xl shadow-sm">
            Hittade inga deals just nu. Kom tillbaka senare!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {deals.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition group">
                
                {/* Rabatt-etikett */}
                <div className="absolute top-4 right-4 bg-red-500 text-white font-bold px-3 py-1 rounded-full text-sm z-10 shadow-md">
                  -{p.discount_percent}%
                </div>

                <Link href={`/product/${p.id}`} className="block relative">
                  <div className="h-48 bg-gray-50 flex items-center justify-center p-6">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition duration-300" />
                    ) : (
                      <span className="text-4xl">🎁</span>
                    )}
                  </div>
                </Link>

                <div className="p-6">
                  <div className="text-xs text-gray-400 font-bold uppercase mb-1">{p.store}</div>
                  <Link href={`/product/${p.id}`} className="hover:text-blue-600">
                    <h3 className="font-bold text-gray-800 text-lg mb-2 line-clamp-2 h-14">{p.name}</h3>
                  </Link>
                  
                  <div className="flex items-end gap-3 mb-4">
                    <span className="text-2xl font-extrabold text-red-600">{p.price} kr</span>
                    <span className="text-sm text-gray-400 line-through mb-1">{p.regular_price} kr</span>
                  </div>

                  <button 
                    onClick={() => addToBasket({
                        id: p.id, name: p.name, ean: "", image_url: p.image_url, 
                        prices: [{ price: p.price, store: p.store, url: p.url }]
                    } as any)}
                    className="w-full bg-blue-50 text-blue-600 font-bold py-3 rounded-xl hover:bg-blue-100 transition"
                  >
                    + Lägg i korg
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}