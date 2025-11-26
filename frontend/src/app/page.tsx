"use client";
import API_URL from "@/lib/config";
import { useState } from "react";

// Uppdaterad typ med bild
type Product = { 
  id: number; 
  name: string; 
  ean: string;
  image_url: string | null; // <-- Nytt fält
  prices: { price: number; store: string; url: string }[] 
};

type OptimizationResult = { 
  type: string;
  stores: string[];
  total_cost: number; 
  details: any[] 
};

export default function Home() {
  // STATES
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [basket, setBasket] = useState<Product[]>([]);
  const [optimizedResults, setOptimizedResults] = useState<OptimizationResult[]>([]);
  const [loading, setLoading] = useState(false);

  // SÖK
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/search?q=${query}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // LÄGG TILL I KORG
  const addToBasket = (product: Product) => {
    if (!basket.find(p => p.id === product.id)) {
      setBasket([...basket, product]);
    }
  };

  // OPTIMERA
  const optimizeBasket = async () => {
    const productIds = basket.map(p => p.id);
    const res = await fetch(`${API_URL}/optimize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_ids: productIds }),
    });
    const data = await res.json();
    setOptimizedResults(data);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      
      {/* VÄNSTER: SÖK & RESULTAT */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Smarta<span className="text-blue-600">Korgen</span>
          </h1>
          <p className="text-gray-500 mt-2">Sök, plocka, spara pengar.</p>
        </header>
        
        <form onSubmit={handleSearch} className="flex gap-3 mb-10 max-w-2xl mx-auto">
          <input 
            className="flex-1 p-4 rounded-full border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" 
            placeholder="Sök produkt (t.ex. Hugo Boss)..." 
            value={query} onChange={(e) => setQuery(e.target.value)} 
          />
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-full font-bold shadow-md transition">
            {loading ? "..." : "Sök"}
          </button>
        </form>

        <div className="grid gap-6 max-w-3xl mx-auto">
          {searchResults.map((p) => (
            <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-5 items-center hover:shadow-md transition">
              
              {/* BILDEN */}
              <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="text-gray-400 text-xs">Ingen bild</span>
                )}
              </div>

              {/* TEXT */}
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-800 leading-tight">{p.name}</h3>
                <p className="text-sm text-gray-500 mt-1">EAN: {p.ean}</p>
                <div className="mt-2 text-blue-600 font-medium">
                  Från {Math.min(...p.prices.map(x => x.price))} kr
                </div>
              </div>

              {/* KNAPP */}
              <button 
                onClick={() => addToBasket(p)}
                className="bg-blue-50 text-blue-600 border border-blue-200 px-5 py-2 rounded-full font-bold hover:bg-blue-100 transition whitespace-nowrap"
              >
                + Lägg i
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* HÖGER: VARUKORGEN */}
      <aside className="w-96 bg-white border-l border-gray-200 p-6 flex flex-col h-screen sticky top-0 shadow-xl z-10">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <span>🛒</span> Din Varukorg ({basket.length})
        </h2>
        
        {/* LISTA */}
        <div className="flex-1 overflow-y-auto mb-6 space-y-3 pr-2">
          {basket.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">
              <p>Korgen är tom.</p>
              <p className="text-sm">Sök efter produkter till vänster.</p>
            </div>
          ) : (
            basket.map(p => (
              <div key={p.id} className="flex gap-3 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                 {/* LITEN BILD I KORGEN OCKSÅ */}
                 <div className="w-10 h-10 bg-white rounded border flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    )}
                 </div>
                 <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                 </div>
                <button onClick={() => setBasket(basket.filter(i => i.id !== p.id))} className="text-gray-400 hover:text-red-500 px-2">
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {/* KNAPP */}
        <button 
          onClick={optimizeBasket}
          disabled={basket.length === 0}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition shadow-lg"
        >
          Hitta billigaste 🚀
        </button>

        {/* RESULTAT */}
        {optimizedResults.length > 0 && (
          <div className="mt-6 animate-fade-in-up">
            <div className="bg-blue-50 p-5 rounded-xl border border-blue-200 shadow-inner">
              <div className="flex justify-between items-start mb-3">
                <div>
                   <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Bästa val</span>
                   <div className="font-bold text-gray-800">{optimizedResults[0].type}</div>
                </div>
                <div className="text-2xl font-extrabold text-blue-700">
                  {optimizedResults[0].total_cost} kr
                </div>
              </div>
              
              <div className="space-y-2 mt-3 pt-3 border-t border-blue-100">
                {optimizedResults[0].details.map((d: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{d.store} ({d.products_count})</span>
                    <span className="font-medium">{d.products_cost + d.shipping} kr</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}