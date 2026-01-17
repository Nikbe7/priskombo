"use client";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import API_URL from "@/lib/config";
import ProductImage from "./ProductImage";
import { Search, X, Loader2, ShoppingBag, FolderOpen, ArrowRight } from "lucide-react"; // Lade till FolderOpen och ArrowRight

// Uppdaterad Type
type SuggestionData = {
  categories: {
    id: number;
    name: string;
    slug: string;
    parent_name: string | null;
    parent_slug: string | null;
  }[];
  brands: string[];
  products: {
    id: number;
    name: string;
    slug: string;
    image_url: string | null;
    brand: string | null;
    min_price: number;
    category_slug?: string;
  }[];
};

function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionData | null>(null);
  const [loading, setLoading] = useState(false);
  
  const debouncedSearch = useDebounce(search, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (debouncedSearch.length < 2) {
      setSuggestions(null);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/search/suggestions?q=${encodeURIComponent(debouncedSearch)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Kunde inte hämta förslag", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    if (search.trim().length > 0) {
      router.push(`/?q=${encodeURIComponent(search)}`);
    }
  };

  const handleSelectSuggestion = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  // Helper för att kolla om vi har NÅGRA resultat
  const hasResults = suggestions && (
      suggestions.categories.length > 0 || 
      suggestions.brands.length > 0 || 
      suggestions.products.length > 0
  );

  return (
    <div ref={wrapperRef} className="hidden md:block flex-1 max-w-2xl mx-8 relative z-50">
      <form onSubmit={handleSearchSubmit} className="relative group" data-testid="search-form">
        <input
          type="text"
          placeholder="Sök efter produkt, varumärke eller kategori..."
          className={`w-full pl-12 pr-12 py-3.5 rounded-full text-base transition-all outline-none border-2 
            ${isOpen 
                ? "rounded-t-2xl rounded-b-none border-blue-500 bg-white text-gray-900" 
                : "border-transparent bg-white text-gray-900 shadow-lg hover:shadow-blue-500/20 focus:border-blue-500 focus:shadow-blue-500/30"
            } placeholder:text-gray-400 font-medium`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (e.target.value.length >= 2) setIsOpen(true);
          }}
          onFocus={() => {
            if (suggestions && search.length >= 2) setIsOpen(true);
          }}
        />
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors ${isOpen ? "text-blue-500" : "text-gray-400"}`} />
        
        {loading && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
            </div>
        )}
        
        {!loading && search.length > 0 && (
             <button 
                type="button"
                onClick={() => { setSearch(""); setIsOpen(false); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
             >
                 <X className="w-5 h-5" />
             </button>
        )}
      </form>

      {/* DROPDOWN FÖRSLAG */}
      {isOpen && suggestions && hasResults && (
        <div className="absolute top-full left-0 right-0 bg-white border-x-2 border-b-2 border-blue-500 rounded-b-2xl shadow-2xl overflow-hidden max-h-[85vh] overflow-y-auto">
          
          {/* --- 1. KATEGORIER --- */}
          {suggestions.categories.length > 0 && (
            <div className="py-2 border-b border-gray-100">
                <div className="px-5 py-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">
                    Kategorier
                </div>
                {suggestions.categories.map((cat) => (
                    <div
                        key={cat.id}
                        onClick={() => handleSelectSuggestion(
                            cat.parent_slug 
                            ? `/${cat.parent_slug}/${cat.slug}` // Subkategori
                            : `/${cat.slug}` // Huvudkategori
                        )}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex items-center justify-between group transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <FolderOpen className="w-4 h-4" />
                            </div>
                            <div className="text-sm text-gray-700 group-hover:text-blue-700">
                                <span className="font-semibold">{cat.name}</span>
                                {cat.parent_name && (
                                    <span className="text-gray-400 font-normal text-xs ml-1">
                                        i {cat.parent_name}
                                    </span>
                                )}
                            </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 -translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </div>
                ))}
            </div>
          )}

          {/* --- 2. VARUMÄRKEN --- */}
          {suggestions.brands.length > 0 && (
            <div className="py-3 border-b border-gray-100 bg-gray-50/50">
              <div className="px-5 py-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">
                Matchande varumärken
              </div>
              <div className="flex flex-wrap gap-2 px-4">
                {suggestions.brands.map((brand, idx) => (
                    <div
                    key={idx}
                    onClick={() => {
                        setSearch(brand);
                        handleSelectSuggestion(`/?q=${encodeURIComponent(brand)}`);
                    }}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer text-sm font-medium text-gray-700 flex items-center gap-2 transition-all shadow-sm"
                    >
                    <span className="text-blue-500 font-bold">#</span>
                    {brand}
                    </div>
                ))}
              </div>
            </div>
          )}

          {/* --- 3. PRODUKTER --- */}
          {suggestions.products.length > 0 && (
            <div className="py-2">
              <div className="px-5 py-2 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Produkter
              </div>
              {suggestions.products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleSelectSuggestion(
                      product.category_slug 
                      ? `/${product.category_slug}/${product.slug}` 
                      : `/product/${product.slug}`
                  )}
                  className="px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center gap-4 transition-colors group border-b border-gray-50 last:border-0"
                >
                  <div className="w-12 h-12 bg-white border border-gray-100 rounded-lg flex-shrink-0 relative flex items-center justify-center p-1 group-hover:border-blue-200 transition-colors">
                    {product.image_url ? (
                        <ProductImage 
                            src={product.image_url} 
                            alt={product.name} 
                            fill 
                            className="object-contain mix-blend-multiply" 
                        />
                    ) : (
                        <span className="text-xs">📦</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-700">
                        {product.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        {product.brand && <span className="font-medium text-gray-600">{product.brand}</span>}
                        {product.brand && <span className="text-gray-300">•</span>}
                        <span className="text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">från {Math.round(product.min_price)} kr</span>
                    </div>
                  </div>
                  
                  <div className="text-gray-300 group-hover:text-blue-500 transition-colors">
                    <Search className="w-4 h-4 transform -rotate-45" />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div 
            onClick={handleSearchSubmit}
            className="p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer text-center text-sm font-bold text-blue-600 border-t border-gray-100 transition-colors"
          >
            Visa alla resultat för "{search}"
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const { totalItems, toggleCart } = useCart();
  const pathname = usePathname();

  const isActive = (path: string) =>
    pathname === path
      ? "text-white bg-white/10 shadow-inner"
      : "text-slate-300 hover:text-white hover:bg-white/5";

  return (
    // ÄNDRING: Mörk bakgrund (slate-900) istället för vit
    <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900 border-b border-slate-800 shadow-xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between gap-4">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3 group flex-shrink-0">
          <div className="bg-gradient-to-tr from-blue-500 to-indigo-500 text-white font-bold text-2xl w-12 h-12 flex items-center justify-center rounded-2xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition duration-300">
            P
          </div>
          <span className="font-extrabold text-2xl tracking-tight hidden sm:block text-white">
            Pris
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Kombo
            </span>
          </span>
        </Link>

        {/* SÖKFÄLT (Nu större och vitt) */}
        <Suspense fallback={<div className="flex-1 max-w-2xl mx-8 h-12 bg-slate-800 rounded-full animate-pulse hidden md:block" />}>
          <SearchBar />
        </Suspense>

        {/* HÖGER DEL */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            href="/deals"
            className={`hidden lg:flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
              pathname === "/deals"
                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : "text-slate-300 hover:text-red-400 hover:bg-white/5"
            }`}
          >
            <span>🔥</span> Deals
          </Link>

          {/* LIST-IKON (Uppdaterad för mörkt tema) */}
          <button
            onClick={toggleCart}
            className="relative group cursor-pointer flex items-center gap-3 hover:bg-white/10 p-2.5 rounded-xl transition-all border border-transparent hover:border-slate-700"
          >
            <div className="relative">
              <ShoppingBag className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg ring-2 ring-slate-900 animate-bounce">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-slate-300 hidden sm:block group-hover:text-white">
              Min lista
            </span>
          </button>
        </div>
      </div>
      
      {/* MOBIL SÖK (Mörk bakgrund här också) */}
      <div className="md:hidden px-4 pb-4 border-t border-slate-800 pt-4 bg-slate-900">
         <Suspense>
            <SearchBarMobile />
         </Suspense>
      </div>
    </nav>
  );
}

function SearchBarMobile() {
    const router = useRouter();
    const [localSearch, setLocalSearch] = useState("");
    
    const goSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if(localSearch.trim()) router.push(`/?q=${encodeURIComponent(localSearch)}`);
        else router.push("/");
    }

    return (
        <form onSubmit={goSearch} className="relative w-full">
            <input 
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-800 text-white placeholder:text-slate-400 focus:bg-slate-700 border border-slate-700 focus:border-blue-500 outline-none transition shadow-inner"
                placeholder="Sök produkt..."
                value={localSearch}
                onChange={e => setLocalSearch(e.target.value)}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        </form>
    )
}