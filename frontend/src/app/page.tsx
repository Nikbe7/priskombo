"use client";
import { useState, useEffect } from "react";
import Link from "next/link"; 
import API_URL from "@/lib/config";
import { useCart } from "@/context/CartContext"; // <-- Importera Global Cart

// Typer
type Product = { 
  id: number; 
  name: string; 
  ean: string;
  image_url: string | null; 
  prices: { price: number; store: string; url: string }[] 
};

type Category = { id: number; name: string; };

export default function Home() {
  // --- STATES ---
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState(""); 
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Hämta addToBasket från global context
  const { addToBasket } = useCart(); 

  // --- EFFEKTER ---

  // Hämta kategorier vid start
  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error(err));
  }, []);

  // Debounce-logik
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
      <main className="p-8 pb-32 max-w-7xl mx-auto"> {/* pb-32 för att inte krocka med mobil-footer om vi har en */}
        
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Pris<span className="text-blue-600">Kombo</span>
          </h1>
          <p className="text-gray-500 mt-2">Sök, plocka, spara pengar.</p>
        </header>
        
        {/* SÖKFÄLT */}
        <form onSubmit={(e) => e.preventDefault()} className="flex gap-3 mb-12 max-w-2xl mx-auto relative">
          <input 
            className="flex-1 p-4 rounded-full border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none pl-6" 
            placeholder="Sök produkt..." 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
          />
          {loading && (
            <div className="absolute right-6 top-4 text-gray-400 animate-pulse">⏳</div>
          )}
        </form>

        {/* KATEGORIER */}
        {searchResults.length === 0 && !loading && query.length === 0 && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold mb-6 text-gray-800">Utforska kategorier</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map(cat => (
                <Link key={cat.id} href={`/category/${cat.id}`}>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition cursor-pointer text-center group">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition duration-300">📦</div>
                    <div className="font-bold text-gray-700 group-hover:text-blue-600">{cat.name}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* SÖKRESULTAT */}
        <div className="grid gap-6 max-w-3xl mx-auto">
          {searchResults.map((p) => (
            <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-5 items-center hover:shadow-md transition">
              
              {/* LÄNKAD BILD */}
              <Link href={`/product/${p.id}`} className="cursor-pointer block flex-shrink-0">
                <div className="w-24 h-24 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center hover:opacity-90 transition">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-2" />
                  ) : (
                    <span className="text-gray-400 text-xs">Ingen bild</span>
                  )}
                </div>
              </Link>

              {/* LÄNKAD INFO */}
              <div className="flex-1 min-w-0">
                <Link href={`/product/${p.id}`} className="hover:underline decoration-blue-500">
                  <h3 className="font-bold text-lg text-gray-800 truncate">{p.name}</h3>
                </Link>
                <div className="mt-2 text-blue-600 font-medium">
                  Från {Math.min(...p.prices.map(x => x.price))} kr
                </div>
              </div>

              {/* LÄGG I GLOBAL KORG */}
              <button 
                onClick={() => addToBasket(p)}
                className="bg-blue-50 text-blue-600 border border-blue-200 px-5 py-2 rounded-full font-bold hover:bg-blue-100 transition whitespace-nowrap flex-shrink-0"
              >
                + Lägg i
              </button>
            </div>
          ))}
        </div>
      </main>
      
      {/* OBS: Varukorgs-sidebar ligger nu i layout.tsx */}
    </div>
  );
}