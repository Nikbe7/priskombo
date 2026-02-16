"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import API_URL from "@/lib/config";
import ProductImage from "@/components/product/ProductImage";
import { Search, X, Loader2, FolderOpen, ArrowRight } from "lucide-react";

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

export default function SearchBar({ mobile = false }: { mobile?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionData | null>(null);
  const [loading, setLoading] = useState(false);
  
  const debouncedSearch = useDebounce(search, 300);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = searchParams.get("q");
    if (q) setSearch(q);
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

  const hasResults = suggestions && (
      suggestions.categories.length > 0 || 
      suggestions.brands.length > 0 || 
      suggestions.products.length > 0
  );

  return (
    <div ref={wrapperRef} className={`relative z-50 ${mobile ? "w-full" : "hidden md:block flex-1 max-w-2xl mx-8"}`}>
      <form onSubmit={handleSearchSubmit} className="relative group" data-testid="search-form">
        <input
          type="text"
          placeholder="Sök efter produkt..."
          className={`w-full ${mobile ? "pl-10 pr-4 py-2 text-sm h-10" : "pl-12 pr-12 py-3.5 text-base"} rounded-xl transition-all outline-none border-2 
            ${isOpen 
                ? "rounded-b-none border-blue-500 bg-white text-gray-900" 
                : mobile 
                    ? "bg-slate-800 text-white placeholder:text-slate-400 focus:bg-slate-700 border-slate-700 focus:border-blue-500"
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
        <Search className={`absolute ${mobile ? "left-3 w-4 h-4" : "left-4 w-5 h-5"} top-1/2 -translate-y-1/2 transition-colors ${isOpen ? "text-blue-500" : "text-gray-400"}`} />
        
        {loading && (
            <div className={`absolute ${mobile ? "right-3" : "right-4"} top-1/2 -translate-y-1/2`}>
                <Loader2 className={`${mobile ? "w-4 h-4" : "w-5 h-5"} text-blue-500 animate-spin`} />
            </div>
        )}
        
        {!loading && search.length > 0 && (
             <button 
                type="button"
                onClick={() => { setSearch(""); setIsOpen(false); }}
                className={`absolute ${mobile ? "right-3" : "right-4"} top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors`}
             >
                 <X className={`${mobile ? "w-4 h-4" : "w-5 h-5"}`} />
             </button>
        )}
      </form>

      {/* DROPDOWN FÖRSLAG */}
      {isOpen && suggestions && hasResults && (
        <div className={`absolute top-full left-0 right-0 bg-white border-x-2 border-b-2 border-blue-500 rounded-b-2xl shadow-2xl overflow-hidden max-h-[60vh] md:max-h-[85vh] overflow-y-auto ${mobile ? "text-xs" : "text-sm"}`}>
          
          {/* --- 1. KATEGORIER --- */}
          {suggestions.categories.length > 0 && (
            <div className="py-1 md:py-2 border-b border-gray-100">
                <div className={`px-3 md:px-5 py-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider ${mobile ? "mb-0" : "mb-1"}`}>
                    Kategorier
                </div>
                {suggestions.categories.map((cat) => (
                    <div
                        key={cat.id}
                        onClick={() => handleSelectSuggestion(
                            cat.parent_slug 
                            ? `/${cat.parent_slug}/${cat.slug}` 
                            : `/${cat.slug}`
                        )}
                        className={`px-3 md:px-4 ${mobile ? "py-1.5" : "py-2"} hover:bg-blue-50 cursor-pointer flex items-center justify-between group transition-colors`}
                    >
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="bg-blue-100 p-1 md:p-1.5 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <FolderOpen className={`${mobile ? "w-3 h-3" : "w-4 h-4"}`} />
                            </div>
                            <div className="text-gray-700 group-hover:text-blue-700 truncate">
                                <span className="font-semibold">{cat.name}</span>
                                {cat.parent_name && !mobile && (
                                    <span className="text-gray-400 font-normal text-xs ml-1">
                                        i {cat.parent_name}
                                    </span>
                                )}
                            </div>
                        </div>
                        <ArrowRight className={`${mobile ? "w-3 h-3" : "w-4 h-4"} text-gray-300 group-hover:text-blue-500`} />
                    </div>
                ))}
            </div>
          )}

          {/* --- 2. VARUMÄRKEN --- */}
          {suggestions.brands.length > 0 && (
            <div className="py-2 border-b border-gray-100 bg-gray-50/50">
              <div className="px-3 md:px-5 py-1 text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">
                Matchande varumärken
              </div>
              <div className="flex flex-wrap gap-1.5 px-3 md:gap-2 md:px-4">
                {suggestions.brands.map((brand, idx) => (
                    <div
                    key={idx}
                    onClick={() => {
                        setSearch(brand);
                        handleSelectSuggestion(`/?q=${encodeURIComponent(brand)}`);
                    }}
                    className={`bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer font-medium text-gray-700 flex items-center gap-1.5 transition-all shadow-sm ${mobile ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-xs md:text-sm"}`}
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
            <div className="py-1 md:py-2">
              <div className="px-3 md:px-5 py-1 md:py-2 text-[10px] uppercase font-bold text-gray-400 tracking-wider">
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
                  className={`px-3 md:px-4 ${mobile ? "py-1.5" : "py-3"} hover:bg-blue-50 cursor-pointer flex items-center gap-3 transition-colors group border-b border-gray-50 last:border-0`}
                >
                  <div className={`${mobile ? "w-8 h-8" : "w-10 h-10 md:w-12 md:h-12"} bg-white border border-gray-100 rounded-lg flex-shrink-0 relative flex items-center justify-center p-0.5 md:p-1 group-hover:border-blue-200 transition-colors`}>
                    {product.image_url ? (
                        <ProductImage 
                            src={product.image_url} 
                            alt={product.name} 
                            fill 
                            className="object-contain mix-blend-multiply" 
                        />
                    ) : (
                        <span className="text-[10px]">📦</span>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className={`${mobile ? "text-xs" : "text-sm"} font-semibold text-gray-800 truncate group-hover:text-blue-700`}>
                        {product.name}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] md:text-xs text-gray-500 mt-0.5">
                        {!mobile && product.brand && <span className="font-medium text-gray-600">{product.brand}</span>}
                        {!mobile && product.brand && <span className="text-gray-300">•</span>}
                        <span className="text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">från {Math.round(product.min_price)} kr</span>
                    </div>
                  </div>
                  
                  <div className="text-gray-300 group-hover:text-blue-500 transition-colors hidden md:block">
                    <Search className="w-4 h-4 transform -rotate-45" />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div 
            onClick={handleSearchSubmit}
            className="p-2 md:p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer text-center text-xs md:text-sm font-bold text-blue-600 border-t border-gray-100 transition-colors"
          >
            Visa alla resultat för &quot;{search}&quot;
          </div>
        </div>
      )}
    </div>
  );
}
