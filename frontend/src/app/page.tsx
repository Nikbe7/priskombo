"use client";
import { useState, useEffect } from "react";
import Link from "next/link"; 
import API_URL from "@/lib/config";

// ... (Behåll dina typer Product, Category etc här) ...
type Product = { 
  id: number; 
  name: string; 
  ean: string;
  image_url: string | null; 
  prices: { price: number; store: string; url: string }[] 
};

type Category = { id: number; name: string; };

type OptimizationResult = { 
  type: string;
  stores: string[];
  total_cost: number; 
  details: any[] 
};

export default function Home() {
  const [query, setQuery] = useState("");
  // Ny state för det vi faktiskt söker på
  const [debouncedQuery, setDebouncedQuery] = useState(""); 
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [basket, setBasket] = useState<Product[]>([]);
  const [optimizedResults, setOptimizedResults] = useState<OptimizationResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error(err));
  }, []);

  // --- DEBOUNCE LOGIK ---
  useEffect(() => {
    // Sätt en timer när användaren skriver
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 400); // Vänta 400ms

    // Rensa timern om användaren skriver igen innan 400ms gått
    return () => {
      clearTimeout(handler);
    };
  }, [query]);

  // --- AUTOMATISK SÖKNING ---
  // Lyssnar på debouncedQuery istället för att submit form manuellt
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

  // (Vi behöver inte längre handleSearch-funktionen för formuläret, 
  // men vi behåller preventDefault på formen så den inte laddar om sidan)

  const addToBasket = (product: Product) => {
    if (!basket.find(p => p.id === product.id)) {
      setBasket([...basket, product]);
    }
  };

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
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Pris<span className="text-blue-600">Kombo</span>
          </h1>
          <p className="text-gray-500 mt-2">Sök, plocka, spara pengar.</p>
        </header>
        
        {/* SÖKFÄLT UTAN KNAPP (Automatiskt) */}
        <form onSubmit={(e) => e.preventDefault()} className="flex gap-3 mb-12 max-w-2xl mx-auto relative">
          <input 
            className="flex-1 p-4 rounded-full border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none pl-6" 
            placeholder="Sök produkt..." 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
          />
          {loading && (
            <div className="absolute right-6 top-4 text-gray-400">
              ⏳
            </div>
          )}
        </form>

        {/* Kategorier visas bara om sökningen är tom */}
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

        <div className="grid gap-6 max-w-3xl mx-auto">
          {searchResults.map((p) => (
            <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex gap-5 items-center hover:shadow-md transition">
              <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-contain p-2" /> : <span className="text-gray-400 text-xs">Ingen bild</span>}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-gray-800">{p.name}</h3>
                <div className="mt-2 text-blue-600 font-medium">
                  Från {Math.min(...p.prices.map(x => x.price))} kr
                </div>
              </div>
              <button onClick={() => addToBasket(p)} className="bg-blue-50 text-blue-600 border border-blue-200 px-5 py-2 rounded-full font-bold hover:bg-blue-100 transition whitespace-nowrap">+ Lägg i</button>
            </div>
          ))}
        </div>
      </main>

      {/* HÖGER: VARUKORG (Oförändrad) */}
      <aside className="w-96 bg-white border-l border-gray-200 p-6 flex flex-col h-screen sticky top-0 shadow-xl z-10">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">🛒 Din Varukorg ({basket.length})</h2>
        <div className="flex-1 overflow-y-auto mb-6 space-y-3 pr-2">
            {basket.map(p => (
              <div key={p.id} className="flex gap-3 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                 <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{p.name}</div></div>
                <button onClick={() => setBasket(basket.filter(i => i.id !== p.id))} className="text-gray-400 hover:text-red-500 px-2">✕</button>
              </div>
            ))}
        </div>
        <button onClick={optimizeBasket} disabled={basket.length === 0} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">Hitta billigaste 🚀</button>
        {optimizedResults.length > 0 && (
          <div className="mt-6 bg-blue-50 p-5 rounded-xl border border-blue-200">
             <div className="font-bold text-xl text-blue-700">{optimizedResults[0].total_cost} kr</div>
             <div className="text-sm text-gray-600">{optimizedResults[0].type}</div>
              <div className="mt-2 text-xs text-gray-500">
                {optimizedResults[0].stores.join(" + ")}
              </div>
          </div>
        )}
      </aside>
    </div>
  );
}