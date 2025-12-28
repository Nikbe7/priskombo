"use client";
import { useState, useEffect } from "react";
import Link from "next/link"; 
import { useRouter } from "next/navigation"; 
import API_URL from "@/lib/config";
import { useCart } from "@/context/CartContext";
import ProductImage from "@/components/ProductImage"; // <--- NY IMPORT

// Typer
type Category = { 
  id: number; 
  name: string; 
  slug: string;
  parent_id: number | null;
  coming_soon: boolean;
};

type Product = { 
  id: number; name: string; ean: string; image_url: string | null; 
  prices: { price: number; store: string; url: string }[] 
};

type Deal = {
  id: number; name: string; image_url: string | null; price: number; regular_price: number; store: string; discount_percent: number; url: string;
};

export default function Home() {
  const router = useRouter(); 
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

  // Hjälpfunktion: Gruppera kategorier
  const rootCategories = categories.filter(c => c.parent_id === null);
  const getSubCategories = (parentId: number) => categories.filter(c => c.parent_id === parentId);

  return (
    <div className="min-h-screen">
      
      {/* HERO */}
      <section className="relative bg-gradient-to-b from-blue-50 to-white pt-32 pb-16 px-6 text-center">
        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4 leading-tight">
            Spara pengar på <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">varje köp</span>
          </h1>
          <p className="text-base text-slate-500 mb-8 max-w-2xl mx-auto">
            Sök, kombinera och optimera. Vi hittar den billigaste lösningen för hela din inköpslista.
          </p>

          <div className="relative max-w-xl mx-auto group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
            <form onSubmit={(e) => e.preventDefault()} className="relative bg-white rounded-full shadow-xl flex items-center p-1.5">
              <span className="pl-4 text-xl">🔍</span>
              <input 
                className="flex-1 p-3 bg-transparent outline-none text-base text-slate-700 placeholder:text-slate-400"
                placeholder="Sök produkt..." 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
              />
              {loading && <div className="pr-4 animate-spin text-sm">⏳</div>}
            </form>
          </div>
        </div>
      </section>

      <main className="p-4 md:p-8 max-w-[1600px] mx-auto">
        
        {/* START-VY */}
        {searchResults.length === 0 && !loading && query.length === 0 && (
          <div className="space-y-16 animate-fade-in-up">
            
            {/* KATEGORI-GRID */}
            <section>
              <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
                Utforska kategorier
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                
                {/* 1. KAMPANJER */}
                <Link href="/deals" className="relative group bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-3 shadow-md shadow-red-100 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex flex-col items-center justify-center h-28 text-white overflow-hidden">
                    <div className="text-3xl mb-1 transform group-hover:scale-110 transition duration-300">🔥</div>
                    <h3 className="text-sm font-bold">Kampanjer</h3>
                    <p className="opacity-90 text-[10px] font-medium uppercase tracking-wide">Fynda nu</p>
                </Link>

                {/* 2. HUVUDKATEGORIER */}
                {rootCategories.map(root => {
                    const subs = getSubCategories(root.id);
                    const isComingSoon = root.coming_soon;

                    return (
                        <div 
                            key={root.id}
                            // Huvudkategori: /parent-slug
                            onClick={() => !isComingSoon && router.push(`/${root.slug}`)}
                            className={`relative group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 h-28 flex flex-col items-center justify-center cursor-pointer overflow-visible ${isComingSoon ? 'opacity-60 cursor-default bg-slate-50' : ''}`}
                        >
                            <div className={`peer h-full w-full flex flex-col items-center justify-center z-10 transition-all duration-300 ${!isComingSoon ? 'hover:-translate-y-1' : ''}`}>
                                <div className="text-2xl mb-2 text-slate-400 peer-hover:text-slate-500 transition-colors">📦</div>
                                <h3 className="font-bold text-slate-700 text-xs md:text-sm text-center px-1 leading-tight group-hover:text-blue-700">
                                    {root.name}
                                </h3>
                                {isComingSoon && <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded">Snart</span>}
                            </div>

                            {/* Dropdown-lista */}
                            {!isComingSoon && (
                                <div 
                                    className="absolute inset-x-0 top-full mt-1 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-blue-100 z-50 flex flex-col 
                                                opacity-0 invisible peer-hover:opacity-100 peer-hover:visible hover:opacity-100 hover:visible 
                                                transition-all duration-200 origin-top transform scale-95 peer-hover:scale-100 hover:scale-100"
                                    onClick={(e) => e.stopPropagation()} 
                                >
                                    <div 
                                        className="p-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 cursor-pointer hover:bg-slate-100 rounded-t-xl"
                                        onClick={() => router.push(`/${root.slug}`)}
                                    >
                                        <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wide">Gå till kategori</span>
                                        <span className="text-[10px] text-blue-600 font-bold">→</span>
                                    </div>
                                    
                                    <div className="p-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                                        {subs.map(sub => (
                                            <Link 
                                                key={sub.id} 
                                                // ÄNDRING: Bygg full sökväg /parent/child
                                                href={`/${root.slug}/${sub.slug}`}
                                                className="block px-3 py-1.5 text-xs text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors font-medium text-left"
                                            >
                                                {sub.name}
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
              </div>
            </section>

            {/* DEALS SEKTIONEN */}
            {homeDeals.length > 0 && (
              <section className="pt-8 border-t border-slate-100">
                <div className="flex justify-between items-end mb-6">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1 h-6 bg-red-500 rounded-full"></span>
                    Heta Deals just nu
                  </h2>
                  <Link href="/deals" className="text-blue-600 text-sm font-bold hover:underline">Se alla deals →</Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {homeDeals.map((deal) => (
                    <div key={deal.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-300 group relative">
                        <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">-{deal.discount_percent}%</div>
                        <Link href={`/product/${deal.id}`} className="block">
                            {/* NYTT: Använder ProductImage och relative container */}
                            <div className="h-32 bg-slate-50 relative flex items-center justify-center p-4">
                                <ProductImage 
                                    src={deal.image_url} 
                                    alt={deal.name}
                                    fill
                                    className="object-contain mix-blend-multiply group-hover:scale-105 transition duration-500"
                                />
                            </div>
                        </Link>
                        <div className="p-4">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{deal.store}</div>
                            <Link href={`/product/${deal.id}`} className="block mb-2 hover:text-blue-600 transition"><h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 h-10">{deal.name}</h3></Link>
                            <div className="flex justify-between items-end">
                                <div><div className="text-gray-400 text-xs line-through">{deal.regular_price} kr</div><div className="text-lg font-extrabold text-red-600">{deal.price} kr</div></div>
                                <button onClick={() => addToBasket({id: deal.id, name: deal.name, ean: "", image_url: deal.image_url, prices: [{ price: deal.price, store: deal.store, url: deal.url }]} as any)} className="bg-blue-50 text-blue-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-600 hover:text-white transition shadow-sm">+</button>
                            </div>
                        </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* SÖKRESULTAT */}
        {searchResults.length > 0 && (
          <div className="space-y-4 max-w-3xl mx-auto animate-fade-in-up">
            <h2 className="text-xl font-bold text-slate-700 mb-4">Sökresultat</h2>
            {searchResults.map((p) => (
              <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-5 items-center hover:shadow-md transition group">
                <Link href={`/product/${p.id}`} className="w-16 h-16 bg-slate-50 rounded-lg relative flex-shrink-0">
                  {/* NYTT: Använder ProductImage */}
                  <ProductImage 
                    src={p.image_url} 
                    alt={p.name}
                    fill
                    className="object-contain mix-blend-multiply p-2 group-hover:scale-105 transition"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/product/${p.id}`} className="block">
                    <h3 className="font-bold text-slate-800 text-base hover:text-blue-600 truncate transition">{p.name}</h3>
                  </Link>
                  <p className="text-blue-600 font-bold mt-1 text-sm">Från {Math.min(...p.prices.map(x => x.price))} kr</p>
                </div>
                <button onClick={() => addToBasket(p)} className="bg-blue-600 text-white px-4 py-1.5 rounded-full font-bold hover:bg-blue-700 transition shadow-md hover:shadow-lg text-sm">+ Lägg till</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}