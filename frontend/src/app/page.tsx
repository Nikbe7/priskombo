"use client";
import { useState, useEffect } from "react";
import Link from "next/link"; 
import API_URL from "@/lib/config";
import { useCart } from "@/context/CartContext"; 

// Typer (Behåll samma som förut)
type Product = { 
  id: number; 
  name: string; 
  ean: string;
  image_url: string | null; 
  prices: { price: number; store: string; url: string }[] 
};
type Category = { id: number; name: string; };
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
  const [homeDeals, setHomeDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);
  const { addToBasket } = useCart(); 

  useEffect(() => {
    fetch(`${API_URL}/categories`).then(res => res.json()).then(data => setCategories(data)).catch(console.error);
    fetch(`${API_URL}/deals?limit=4`).then(res => res.json()).then(data => setHomeDeals(data)).catch(console.error);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(query), 400);
    return () => clearTimeout(handler);
  }, [query]);

  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.length < 2) { setSearchResults([]); return; }
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
    <div className="min-h-screen pt-20"> {/* pt-20 kompenserar för sticky navbar */}
      
      {/* HERO SEKTION (Bakgrund + Sök) */}
      <section className="relative bg-gradient-to-b from-blue-50 to-white pt-16 pb-20 px-6 text-center">
        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
            Spara pengar på <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">varje köp</span>
          </h1>
          <p className="text-lg text-slate-500 mb-10 max-w-2xl mx-auto">
            Sök, kombinera och optimera. Vi hittar den billigaste lösningen för hela din varukorg genom att jämföra alla butiker samtidigt.
          </p>

          {/* SÖKFÄLT (Lyxigare design) */}
          <div className="relative max-w-2xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
            <form onSubmit={(e) => e.preventDefault()} className="relative bg-white rounded-full shadow-xl flex items-center p-2">
              <span className="pl-4 text-2xl">🔍</span>
              <input 
                className="flex-1 p-4 bg-transparent outline-none text-lg text-slate-700 placeholder:text-slate-400"
                placeholder="Sök produkt (t.ex. Hugo Boss)..." 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
              />
              {loading && <div className="pr-6 animate-spin">⏳</div>}
            </form>
          </div>
        </div>
      </section>

      <main className="p-8 max-w-7xl mx-auto">
        
        {/* START-VY: KATEGORIER & DEALS */}
        {searchResults.length === 0 && !loading && query.length === 0 && (
          <div className="space-y-20 animate-fade-in-up">
            
            {/* KATEGORIER */}
            <section>
              <h2 className="text-2xl font-bold mb-8 text-slate-800 flex items-center gap-2">
                <span className="w-1 h-8 bg-blue-600 rounded-full"></span>
                Utforska kategorier
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Link href="/deals" className="group">
                  <div className="bg-gradient-to-br from-red-500 to-rose-600 p-6 rounded-2xl shadow-lg shadow-red-200 hover:shadow-xl hover:scale-105 transition text-center h-full flex flex-col justify-center text-white">
                    <div className="text-3xl mb-2">🔥</div>
                    <div className="font-bold">Kampanjer</div>
                  </div>
                </Link>

                {categories.map(cat => (
                  <Link key={cat.id} href={`/category/${cat.id}`} className="group">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-md transition text-center h-full flex flex-col justify-center">
                      <div className="text-4xl mb-3 grayscale group-hover:grayscale-0 group-hover:scale-110 transition duration-300">📦</div>
                      <div className="font-bold text-slate-700 group-hover:text-blue-600">{cat.name}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            {/* DEALS */}
            {homeDeals.length > 0 && (
              <section>
                <div className="flex justify-between items-end mb-8">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1 h-8 bg-red-500 rounded-full"></span>
                    Heta Deals just nu
                  </h2>
                  <Link href="/deals" className="text-blue-600 font-bold hover:underline">Se alla deals →</Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {homeDeals.map((deal) => (
                    <div key={deal.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                      <div className="relative h-48 bg-slate-50 p-6 flex items-center justify-center">
                        <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md z-10">
                          -{deal.discount_percent}%
                        </div>
                        {deal.image_url ? (
                          <img src={deal.image_url} alt="" className="max-h-full object-contain mix-blend-multiply group-hover:scale-110 transition duration-500" />
                        ) : <span className="text-4xl">🎁</span>}
                      </div>

                      <div className="p-5">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{deal.store}</div>
                        <Link href={`/product/${deal.id}`} className="block mb-3 hover:text-blue-600 transition">
                          <h3 className="font-bold text-slate-800 text-lg leading-snug line-clamp-2 h-12">{deal.name}</h3>
                        </Link>
                        
                        <div className="flex justify-between items-end">
                          <div>
                            <div className="text-gray-400 text-sm line-through">{deal.regular_price} kr</div>
                            <div className="text-2xl font-extrabold text-red-600">{deal.price} kr</div>
                          </div>
                          <button 
                            onClick={() => addToBasket({
                                id: deal.id, name: deal.name, ean: "", image_url: deal.image_url, 
                                prices: [{ price: deal.price, store: deal.store, url: deal.url }]
                            } as any)}
                            className="bg-blue-50 text-blue-600 w-10 h-10 flex items-center justify-center rounded-full hover:bg-blue-600 hover:text-white transition shadow-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* SÖKRESULTAT LISTA */}
        {searchResults.length > 0 && (
          <div className="space-y-4 max-w-3xl mx-auto animate-fade-in-up">
            <h2 className="text-xl font-bold text-slate-700 mb-4">Sökresultat</h2>
            {searchResults.map((p) => (
              <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-5 items-center hover:shadow-md transition group">
                <Link href={`/product/${p.id}`} className="w-20 h-20 bg-slate-50 rounded-lg flex items-center justify-center p-2 flex-shrink-0">
                  {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition" /> : "📷"}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${p.id}`} className="block">
                    <h3 className="font-bold text-slate-800 text-lg hover:text-blue-600 truncate transition">{p.name}</h3>
                  </Link>
                  <p className="text-blue-600 font-bold mt-1">
                    Från {Math.min(...p.prices.map(x => x.price))} kr
                  </p>
                </div>
                <button 
                  onClick={() => addToBasket(p)}
                  className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700 transition shadow-md hover:shadow-lg"
                >
                  + Lägg i
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}