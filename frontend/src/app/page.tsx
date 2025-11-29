"use client";
import { useState, useEffect } from "react";
import Link from "next/link"; 
import API_URL from "@/lib/config";
import { useCart } from "@/context/CartContext"; 

// Typer
type Product = { 
  id: number; 
  name: string; 
  ean: string;
  image_url: string | null; 
  prices: { price: number; store: string; url: string }[] 
};

type Category = { id: number; name: string; };

// Ny typ för Deals (matchar backend-svaret från /deals)
type Deal = {
  id: number;
  name: string;
  image_url: string | null;
  price: number;
  regular_price: number;
  store: string;
  discount_percent: number;
  url: string;
};

export default function Home() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(""); 
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [homeDeals, setHomeDeals] = useState<Deal[]>([]); // <-- State för startsidans deals
  const [loading, setLoading] = useState(false);

  const { addToBasket } = useCart(); 

  // Hämta kategorier OCH deals vid start
  useEffect(() => {
    // 1. Kategorier
    fetch(`${API_URL}/categories`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error(err));

    // 2. Deals (Hämta topp 4 för startsidan)
    fetch(`${API_URL}/deals?limit=4`)
      .then(res => res.json())
      .then(data => setHomeDeals(data))
      .catch(err => console.error(err));
  }, []);

  // Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400);
    return () => clearTimeout(handler);
  }, [query]);

  // Sökning
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.length < 2) {
        setSearchResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/search?q=${debouncedQuery}`);
        const data = await res.json();
        setSearchResults(data);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    performSearch();
  }, [debouncedQuery]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <main className="p-8 pb-32 max-w-7xl mx-auto">
        
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Pris<span className="text-blue-600">Kombo</span>
          </h1>
          <p className="text-gray-500 mt-2">Sök, plocka, spara pengar.</p>
        </header>
        
        <form onSubmit={(e) => e.preventDefault()} className="flex gap-3 mb-12 max-w-2xl mx-auto relative">
          <input 
            className="flex-1 p-4 rounded-full border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none pl-6" 
            placeholder="Sök produkt..." 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
          />
          {loading && <div className="absolute right-6 top-4 text-gray-400 animate-pulse">⏳</div>}
        </form>

        {/* START-INNEHÅLL (Visas bara om ingen sökning görs) */}
        {searchResults.length === 0 && !loading && query.length === 0 && (
          <div className="max-w-6xl mx-auto space-y-16">
            
            {/* SEKTION 1: KATEGORIER */}
            <section>
              <h2 className="text-xl font-bold mb-6 text-gray-800">Utforska kategorier</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                
                {/* MANUELLT KORT: KAMPANJER / DEALS */}
                <Link href="/deals">
                  <div className="bg-red-50 p-4 rounded-xl shadow-sm border border-red-100 hover:shadow-md hover:border-red-200 transition cursor-pointer text-center group h-full flex flex-col justify-center">
                    <div className="text-3xl mb-2 group-hover:scale-110 transition duration-300">🔥</div>
                    <div className="font-bold text-red-600 group-hover:text-red-700 text-sm">Kampanjer</div>
                  </div>
                </Link>

                {categories.map(cat => (
                  <Link key={cat.id} href={`/category/${cat.id}`}>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition cursor-pointer text-center group h-full flex flex-col justify-center">
                      <div className="text-3xl mb-2 group-hover:scale-110 transition duration-300">📦</div>
                      <div className="font-bold text-gray-700 group-hover:text-blue-600 text-sm">{cat.name}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* SEKTION 2: HETA DEALS (NY!) */}
            {homeDeals.length > 0 && (
              <section>
                <div className="flex justify-between items-end mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Heta Deals 🔥</h2>
                  <Link href="/deals" className="text-blue-600 font-medium hover:underline">Se alla deals →</Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {homeDeals.map((deal) => (
                    <div key={deal.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition group relative">
                      {/* Rabatt-lapp */}
                      <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                        -{deal.discount_percent}%
                      </div>

                      <Link href={`/product/${deal.id}`} className="block">
                        <div className="h-40 bg-gray-50 flex items-center justify-center p-4">
                          {deal.image_url ? (
                            <img src={deal.image_url} alt="" className="max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition" />
                          ) : (
                            <span className="text-2xl">🎁</span>
                          )}
                        </div>
                      </Link>

                      <div className="p-4">
                        <Link href={`/product/${deal.id}`} className="hover:text-blue-600">
                          <h3 className="font-bold text-gray-800 text-sm mb-1 line-clamp-2 h-10">{deal.name}</h3>
                        </Link>
                        
                        <div className="flex items-end gap-2 mb-3">
                          <span className="text-lg font-extrabold text-red-600">{deal.price} kr</span>
                          <span className="text-xs text-gray-400 line-through mb-1">{deal.regular_price} kr</span>
                        </div>

                        <button 
                          onClick={() => addToBasket({
                              id: deal.id, name: deal.name, ean: "", image_url: deal.image_url, 
                              prices: [{ price: deal.price, store: deal.store, url: deal.url }]
                          } as any)}
                          className="w-full bg-blue-50 text-blue-600 text-sm font-bold py-2 rounded-lg hover:bg-blue-100 transition"
                        >
                          + Lägg i
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>
        )}

        {/* SÖKRESULTAT (Visas vid sökning) */}
        {searchResults.length > 0 && (
          <div className="grid gap-6 max-w-3xl mx-auto">
            {searchResults.map((p) => (
              <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-5 items-center hover:shadow-md transition">
                <Link href={`/product/${p.id}`} className="cursor-pointer block flex-shrink-0">
                  <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center hover:opacity-90 transition">
                    {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-2" /> : <span className="text-gray-400 text-xs">Ingen bild</span>}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${p.id}`} className="hover:underline decoration-blue-500">
                    <h3 className="font-bold text-lg text-gray-800 truncate">{p.name}</h3>
                  </Link>
                  <div className="mt-2 text-blue-600 font-medium">Från {Math.min(...p.prices.map(x => x.price))} kr</div>
                </div>
                <button onClick={() => addToBasket(p)} className="bg-blue-50 text-blue-600 border border-blue-200 px-5 py-2 rounded-full font-bold hover:bg-blue-100 transition whitespace-nowrap flex-shrink-0">+ Lägg i</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}