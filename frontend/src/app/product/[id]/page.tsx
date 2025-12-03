"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import API_URL from "@/lib/config";
import { useCart } from "@/context/CartContext";

type ProductDetails = {
  id: number;
  name: string;
  ean: string;
  image_url: string | null;
  category: string | null;
  prices: { 
    store: string; 
    price: number; 
    url: string; 
    shipping: number;
  }[];
};

export default function ProductPage() {
  const params = useParams();
  const { addToBasket } = useCart();
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetch(`${API_URL}/products/${params.id}`)
        .then((res) => {
            if (!res.ok) throw new Error("Produkten hittades inte");
            return res.json();
        })
        .then((data) => setProduct(data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) return <div className="p-20 text-center text-gray-500 pt-32">Laddar produkt...</div>;
  if (!product) return <div className="p-20 text-center pt-32">Produkten kunde inte hittas.</div>;

  const bestPrice = product.prices[0];

  return (
    // Lade till pt-24 här
    <div className="min-h-screen bg-gray-50 p-6 font-sans pb-32 pt-24">
      <div className="max-w-5xl mx-auto">
        
        <div className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-blue-600">Hem</Link> 
          <span className="mx-2">/</span>
          {product.category && <span className="text-gray-700">{product.category}</span>}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="md:flex">
            
            {/* BILD */}
            <div className="md:w-1/3 bg-gray-50 p-8 flex items-center justify-center border-r border-gray-100">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="max-w-full max-h-80 object-contain mix-blend-multiply" />
              ) : (
                <span className="text-6xl">📦</span>
              )}
            </div>

            {/* INFO */}
            <div className="md:w-2/3 p-8">
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{product.name}</h1>
              <p className="text-gray-400 text-sm font-mono mb-6">EAN: {product.ean}</p>

              {/* BÄSTA PRISET & ACTION */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <span className="text-blue-600 font-bold text-sm uppercase tracking-wide">Bästa priset just nu</span>
                  <div className="text-4xl font-extrabold text-gray-900 mt-1">{bestPrice.price} kr</div>
                  <div className="text-gray-500 text-sm mt-1">hos {bestPrice.store}</div>
                </div>
                
                <div className="flex gap-3">
                    {/* KNAPP 1: KÖP NU (Går till butiken) */}
                    <a 
                      href={bestPrice.url} 
                      target="_blank"
                      className="bg-white text-blue-600 border border-blue-200 px-6 py-3 rounded-full font-bold shadow-sm hover:bg-blue-50 transition"
                    >
                      Gå till butik ↗
                    </a>

                    {/* KNAPP 2: LÄGG I PRISKOMBO (Global Korg) */}
                    <button 
                      onClick={() => addToBasket(product as any)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold shadow-lg transition transform hover:scale-105"
                    >
                      + Lägg till
                    </button>
                </div>
              </div>

              {/* LISTA */}
              <h3 className="font-bold text-gray-800 mb-4 text-lg">Jämför alla butiker ({product.prices.length})</h3>
              <div className="space-y-3">
                {product.prices.map((offer, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 border rounded-lg hover:border-blue-300 transition bg-white">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-700">{offer.store}</span>
                      {idx === 0 && <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded font-bold">Billigast</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-lg">{offer.price} kr</div>
                        <div className="text-xs text-gray-400">Frakt: {offer.shipping} kr</div>
                      </div>
                      <a href={offer.url} target="_blank" className="text-blue-600 font-medium hover:underline text-sm px-3 py-1 bg-blue-50 rounded">
                        Till butik →
                      </a>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}