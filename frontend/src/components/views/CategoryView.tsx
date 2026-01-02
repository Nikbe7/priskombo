"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import API_URL from "@/lib/config";
import { useCart } from "@/context/CartContext";
import { createProductUrl } from "@/lib/utils"; // <-- NY IMPORT
import ProductImage from "@/components/ProductImage"; // Bra att använda denna om du har den

// --- KOMPONENTER ---

const SubCategoryLinks = ({ currentSlug, subCategories }: { currentSlug: string, subCategories: any[] }) => {
  if (subCategories.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-8">
      {subCategories.map((sub: any) => (
        <Link 
            key={sub.id} 
            // Bygg vidare på URL:en: /nuvarande-kategori/underkategori
            href={`/${currentSlug}/${sub.slug}`} 
            className="group"
        >
          <div className="bg-white p-3 rounded-lg shadow-sm border border-slate-100 hover:border-blue-300 hover:shadow-md transition text-center flex flex-col items-center justify-center h-full">
             <span className="text-xl mb-1 grayscale group-hover:grayscale-0 transition">📦</span>
             <span className="font-bold text-slate-700 text-xs group-hover:text-blue-600 w-full truncate px-1">{sub.name}</span>
          </div>
        </Link>
      ))}
    </div>
  );
};

// --- MAIN COMPONENT ---

export default function CategoryView() {
  const params = useParams();
  const slugPath = params.slug as string[]; 
  
  // Hämta sista delen av URL:en för att veta vilken kategori vi är på
  const currentSlug = slugPath ? slugPath[slugPath.length - 1] : "";
  const parentSlug = slugPath && slugPath.length > 1 ? slugPath[slugPath.length - 2] : null;

  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToBasket } = useCart();
  
  // URL Params
  const currentSort = searchParams.get("sort") || "popularity";
  const currentSearch = searchParams.get("search") || "";
  
  // Data state
  const [categoryInfo, setCategoryInfo] = useState<any>(null);
  const [parentCategory, setParentCategory] = useState<any>(null);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  // Loading & Pagination State
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0); 

  const LIMIT = 50;

  const [searchTerm, setSearchTerm] = useState(currentSearch);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);

  const observer = useRef<IntersectionObserver | null>(null);
  
  const lastProductElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore]);

  // 1. Debounce Sökning
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== currentSearch) {
        const newParams = new URLSearchParams(searchParams.toString());
        if(searchTerm) newParams.set("search", searchTerm);
        else newParams.delete("search");
        
        // Vi måste veta grund-URL:en här
        if (slugPath) {
             router.replace(`/${slugPath.join('/')}?${newParams.toString()}`);
        }
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // 2. Ladda Kategori-info
  useEffect(() => {
    if (!currentSlug) return;

    const fetchCategoryStructure = async () => {
      setLoadingInitial(true);
      setProducts([]);
      setPage(1);
      setHasMore(true);
      setTotalCount(0);

      try {
        const catRes = await fetch(`${API_URL}/categories`);
        const allCategories = await catRes.json();
        
        const foundCategory = allCategories.find((c: any) => c.slug === currentSlug);

        if (!foundCategory) {
            setLoadingInitial(false);
            return;
        }

        setCategoryInfo(foundCategory);

        if (foundCategory.parent_id) {
            const parent = allCategories.find((c: any) => c.id === foundCategory.parent_id);
            setParentCategory(parent || null);
        } else {
            setParentCategory(null);
        }

        const children = allCategories.filter((c: any) => c.parent_id === foundCategory.id);
        setSubCategories(children);
        
        setLoadingInitial(false);
      } catch (err) {
        console.error(err);
        setLoadingInitial(false);
      }
    };

    fetchCategoryStructure();
  }, [currentSlug]);

  // 3. Ladda Produkter
  useEffect(() => {
    if (!categoryInfo) return;

    const fetchProducts = async () => {
      setLoadingMore(true);
      try {
        const idsToFetch = [categoryInfo.id, ...subCategories.map((c: any) => c.id)];
        
        const query = new URLSearchParams();
        idsToFetch.forEach(id => query.append("category_ids", id.toString()));
        
        query.set("skip", ((page - 1) * LIMIT).toString());
        query.set("limit", LIMIT.toString());
        
        if (currentSearch) query.set("search", currentSearch);
        if (currentSort !== 'popularity') query.set("sort", currentSort);

        const res = await fetch(`${API_URL}/products?${query.toString()}`);
        
        const responseData = await res.json();
        
        setTotalCount(responseData.total);
        const newProducts = responseData.data;

        setProducts(prev => {
            if (page === 1) return newProducts;
            const existingIds = new Set(prev.map(p => p.id));
            const uniqueNew = newProducts.filter((p: any) => !existingIds.has(p.id));
            return [...prev, ...uniqueNew];
        });

        if (newProducts.length < LIMIT) {
            setHasMore(false);
        } else {
            setHasMore(true);
        }

      } catch (err) {
        console.error("Failed to fetch products", err);
      } finally {
        setLoadingMore(false);
      }
    };

    fetchProducts();
  }, [categoryInfo, subCategories, page, currentSort, currentSearch]);


  const updateParams = (updates: any) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.keys(updates).forEach(key => {
        const value = updates[key];
        if (!value) newParams.delete(key);
        else newParams.set(key, value.toString());
    });
    router.push(`/${slugPath.join('/')}?${newParams.toString()}`);
    
    if (updates.sort) {
        setPage(1);
        setHasMore(true);
        setProducts([]);
    }
  };

  if (loadingInitial) return <div className="min-h-screen flex items-center justify-center pt-20"><div className="animate-spin text-4xl">⏳</div></div>;
  if (!categoryInfo) return <div className="min-h-screen flex items-center justify-center pt-20">Kategorin hittades inte.</div>;

  return (
    <div className="min-h-screen bg-gray-50 pt-28 pb-32 px-4 md:px-8 font-sans">
        <div className="max-w-7xl mx-auto">
            
            {/* Header */}
            <div className="mb-8">
                <div className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                    <Link href="/" className="hover:text-blue-600">Start</Link>
                    <span>/</span>
                    {parentCategory && (
                        <>
                            <Link href={`/${parentCategory.slug}`} className="hover:text-blue-600 capitalize">
                                {parentCategory.name}
                            </Link>
                            <span>/</span>
                        </>
                    )}
                    <span className="text-gray-900 font-medium capitalize">{categoryInfo.name}</span>
                </div>
                
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2">{categoryInfo.name}</h1>
                <p className="text-gray-500">{products.length} / {totalCount} produkter visade</p>
            </div>

            <SubCategoryLinks currentSlug={categoryInfo.slug} subCategories={subCategories} />

            <div className="flex flex-col lg:flex-row gap-8">
                
                {/* FILTER PANEL */}
                <aside className="w-full lg:w-64 flex-shrink-0 space-y-8 hidden md:block">
                    <div>
                        <h3 className="font-bold text-gray-900 mb-3">Sök i {categoryInfo.name}</h3>
                        <input 
                            type="text" 
                            placeholder="Sök produkt..."
                            className="w-full p-3 rounded-lg border border-gray-200 focus:border-blue-500 outline-none text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </aside>

                {/* PRODUKTLISTA */}
                <div className="flex-1">
                    <div className="flex justify-end mb-6">
                        <select 
                            value={currentSort} 
                            onChange={(e) => updateParams({ sort: e.target.value })} 
                            className="p-2 rounded-lg border border-gray-300 bg-white text-sm font-medium focus:border-blue-500 outline-none cursor-pointer"
                        >
                            <option value="popularity">Populärast</option>
                            <option value="price_asc">Pris (Lågt - Högt)</option>
                            <option value="price_desc">Pris (Högt - Lågt)</option>
                            <option value="rating_desc">Betyg</option>
                            <option value="name_asc">Namn (A-Ö)</option>
                        </select>
                    </div>

                    {products.length === 0 && !loadingMore ? (
                        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                            <p className="text-gray-500">Inga produkter hittades.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {products.map((p: any, index: number) => {
                                const minPrice = p.prices && p.prices.length > 0 ? Math.min(...p.prices.map((x:any) => x.price)) : 0;
                                // Vi skickar med category slug här!
                                const productUrl = createProductUrl(p.id, p.slug, p.name, categoryInfo.slug);
                                
                                const content = (
                                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition group h-full">
                                         {/* Länk runt hela kortet eller delar av det */}
                                         <Link href={productUrl} className="block relative flex-1">
                                            <div className="h-48 bg-gray-50 rounded-lg flex items-center justify-center p-4 mb-4 relative overflow-hidden">
                                                <ProductImage 
                                                    src={p.image_url} 
                                                    alt={p.name}
                                                    className="max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition duration-300"
                                                />
                                                {p.rating > 0 && (
                                                    <span className="absolute bottom-2 left-2 bg-white/90 px-2 py-1 rounded text-xs font-bold text-yellow-600 shadow-sm flex items-center gap-1">
                                                        ⭐ {p.rating}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="font-bold text-gray-800 text-base leading-snug mb-2 group-hover:text-blue-600 line-clamp-2">{p.name}</h3>
                                        </Link>
                                        
                                        <div className="mt-auto pt-4 border-t border-gray-50 flex justify-between items-center">
                                            <div>
                                                <p className="text-blue-600 font-extrabold text-lg">{minPrice} kr</p>
                                                <p className="text-xs text-gray-400">{p.prices?.length || 0} butiker</p>
                                            </div>
                                            <button onClick={() => addToBasket(p)} className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white w-10 h-10 rounded-full flex items-center justify-center transition font-bold shadow-sm">+</button>
                                        </div>
                                    </div>
                                );

                                if (products.length === index + 1) {
                                    return <div ref={lastProductElementRef} key={p.id}>{content}</div>;
                                } else {
                                    return <div key={p.id}>{content}</div>;
                                }
                            })}
                        </div>
                    )}
                    
                    {loadingMore && (
                        <div className="py-8 text-center text-gray-500 animate-pulse font-medium">Läser in produkter...</div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
}