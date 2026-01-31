"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import API_URL from "@/lib/config";
import { useCart } from "@/context/CartContext";
import ProductImage from "@/components/ProductImage";
import { createProductUrl } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORY_IMAGES: Record<string, string> = {
  "Skönhet & Hälsa": "/categoryImages/skonhet-halsa.png",
  "Kläder & Accessoarer": "/categoryImages/klader-accessoarer.png",
  "Hem & Hushåll": "/categoryImages/hem-hushall.png",
  "Teknik & Datorer": "/categoryImages/teknik-datorer.png",
  "Barn & Familj": "/categoryImages/barn-familj.png",
  "Sport & Fritid": "/categoryImages/sport-fritid.png",
  "Bygg & Trädgård": "/categoryImages/bygg-tradgard.png",
  "Husdjur": "/categoryImages/husdjur.png",
  "Fordon & Tillbehör": "/categoryImages/fordon-tillbehor.png",
  "Mat & Dryck": "/categoryImages/mat-dryck.png",
  "Kontor & Företag": "/categoryImages/kontor-foretag.png",
  "Begagnade produkter": "/categoryImages/begagnade-produkter.png",
};

// Typer
type Category = {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  coming_soon: boolean;
};

type Product = {
  id: number;
  name: string;
  ean: string;
  slug: string | null;
  image_url: string | null;
  category: { name: string; slug: string } | null;
  prices: { price: number; store: string; url: string }[];
};

type Deal = {
  id: number;
  name: string;
  slug: string | null;
  image_url: string | null;
  price: number;
  regular_price: number;
  store: string;
  discount_percent: number;
  url: string;
};

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams(); 
  const queryFromUrl = searchParams.get("q") || "";

  const [categories, setCategories] = useState<Category[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [homeDeals, setHomeDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);

  const { addToBasket } = useCart();

  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then((res) => {
        if (!res.ok) throw new Error(`Kunde inte hämta kategorier: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
        else setCategories([]); 
      })
      .catch((err) => {
        console.error(err);
        setCategories([]);
      });

    fetch(`${API_URL}/deals?limit=4`)
      .then((res) => {
        if (!res.ok) return [];
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) setHomeDeals(data);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const performSearch = async () => {
      if (queryFromUrl.length < 2) {
        setSearchResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(queryFromUrl)}`);
        if (!res.ok) throw new Error("Nätverksfel");
        const data = await res.json();
        setSearchResults(data);
      } catch (err) {
        console.error(err);
        toast.error("Kunde inte hämta sökresultat.");
      }
      setLoading(false);
    };
    performSearch();
  }, [queryFromUrl]);

  const rootCategories = categories.filter((c) => c.parent_id === null);
  const getSubCategories = (parentId: number) =>
    categories.filter((c) => c.parent_id === parentId);

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative bg-gradient-to-b from-blue-100 to-white pt-24 pb-12 md:pt-28 md:pb-20 px-4 text-center overflow-hidden">
        {/* Decorative Shapes */}
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-100 to-blue-200/50 blur-3xl opacity-60"></div>
        <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-tl from-rose-100 to-red-100/50 blur-3xl opacity-50"></div>
        
        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="text-2xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-2 md:mb-3 leading-tight">
            Spara pengar på <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              varje köp
            </span>
          </h1>
          <p className="text-xs md:text-base text-slate-500 mb-2 max-w-xl mx-auto leading-relaxed px-2">
            Sök, kombinera och optimera. Vi hittar den billigaste lösningen för
            hela din inköpslista.
          </p>
          
          {loading && (
             <div className="max-w-md mx-auto mt-4 p-3 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 animate-pulse">
                <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
             </div>
          )}
        </div>
      </section>

      <main className="px-3 py-2 md:p-8 max-w-[1600px] mx-auto">
        {/* START-VY */}
        {searchResults.length === 0 && !loading && queryFromUrl.length === 0 && (
          <div className="space-y-10 md:space-y-12 animate-fade-in-up">
            
            {/* KATEGORI-GRID */}
            <section className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
              <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 text-slate-800 flex items-center gap-2 px-1">
                <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
                Utforska kategorier
              </h2>

              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-x-2 gap-y-6 md:gap-6">
                
                {/* 1. KAMPANJER (RUND) */}
                <Link
                  href="/deals"
                  className="flex flex-col items-center group cursor-pointer"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-red-500 to-rose-600 shadow-md shadow-red-100 flex items-center justify-center transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      width="28" 
                      height="28" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="white" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round">
                      <path d="M12.586 2.586a2 2 0 0 0-2.828 0L2.586 9.757a2 2 0 0 0 0 2.828l7.172 7.172a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828L12.586 2.586z"/>
                      <circle cx="8.5" cy="8.5" r="1.5" fill="white"/>
                    </svg>
                  </div>
                  <span className="text-[10px] md:text-xs font-bold text-slate-700 text-center mt-2 leading-tight group-hover:text-red-600 transition-colors">
                    Kampanjer
                  </span>
                </Link>

                {/* 2. HUVUDKATEGORIER (RUNDA) */}
                {rootCategories.map((root) => {
                  const subs = getSubCategories(root.id);
                  const isComingSoon = root.coming_soon;
                  const imageSrc = CATEGORY_IMAGES[root.name];

                  return (
                    <div
                      key={root.id}
                      className={`relative flex flex-col items-center group ${
                        isComingSoon ? "opacity-60 cursor-default" : "cursor-pointer"
                      }`}
                      onClick={() => !isComingSoon && router.push(`/${root.slug}`)}
                    >
                      {/* Cirkulär behållare */}
                      <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full bg-white shadow-sm border-2 border-slate-100 relative overflow-hidden transition-all duration-300 z-10 ${
                        !isComingSoon ? "group-hover:scale-110 group-hover:shadow-md group-hover:border-blue-400" : ""
                      }`}>
                        {imageSrc ? (
                          <Image
                            src={imageSrc}
                            alt={root.name}
                            fill
                            className="object-cover" 
                            sizes="(max-width: 768px) 64px, 80px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-xl md:text-2xl">📦</span>
                          </div>
                        )}
                        
                        {/* Coming Soon badge */}
                        {isComingSoon && (
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/50 backdrop-blur-sm text-white text-[8px] font-bold px-2 py-1 rounded-full z-20">
                            SNART
                          </div>
                        )}
                      </div>

                      {/* Kategorinamn under cirkeln */}
                      <span className="text-[10px] md:text-xs font-bold text-slate-700 text-center mt-2 leading-tight px-1 group-hover:text-blue-600 transition-colors line-clamp-2">
                        {root.name}
                      </span>

                      {/* Hover-meny (Dropdown) */}
                      {!isComingSoon && (
                        <div
                          className="absolute left-1/2 -translate-x-1/2 top-[90%] mt-2 w-48 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-blue-100 z-50 flex flex-col 
                                    opacity-0 invisible group-hover:opacity-100 group-hover:visible hover:opacity-100 hover:visible 
                                    transition-all duration-200 origin-top transform scale-95 group-hover:scale-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Pil uppåt för dropdown */}
                          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-t border-l border-blue-100 rotate-45"></div>

                          <div
                            className="p-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 cursor-pointer hover:bg-slate-100 rounded-t-xl relative z-10"
                            onClick={() => router.push(`/${root.slug}`)}
                          >
                            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wide">
                              Öppna kategori
                            </span>
                            <span className="text-[10px] text-blue-600 font-bold">→</span>
                          </div>

                          <div className="p-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 relative z-10">
                            {subs.length > 0 ? (
                              subs.map((sub) => (
                                <Link
                                  key={sub.id}
                                  href={`/${root.slug}/${sub.slug}`}
                                  className="block px-3 py-2 text-xs text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors font-medium text-left"
                                >
                                  {sub.name}
                                </Link>
                              ))
                            ) : (
                                <span className="block px-3 py-2 text-xs text-slate-400 italic text-center">Inga underkategorier</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* DEALS SEKTION */}
            {homeDeals.length > 0 && (
              <section className="pt-6 md:pt-8">
                <div className="flex justify-between items-end mb-4 md:mb-6 px-1">
                  <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1 h-5 bg-red-500 rounded-full"></span>
                    Utvalda deals
                  </h2>
                  <Link
                    href="/deals"
                    className="text-blue-600 text-xs md:text-sm font-bold hover:underline"
                  >
                    Se alla deals →
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {homeDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="bg-white rounded-xl shadow-sm border border-slate-200/80 overflow-hidden hover:shadow-lg transition-all duration-300 group relative"
                    >
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
                        -{deal.discount_percent}%
                      </div>
                      <Link
                        href={createProductUrl(deal.id, deal.slug, deal.name)}
                        className="block"
                      >
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
                        <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                          {deal.store}
                        </div>
                        <Link
                          href={createProductUrl(deal.id, deal.slug, deal.name)}
                          className="block mb-2 hover:text-blue-600 transition"
                        >
                          <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 h-10">
                            {deal.name}
                          </h3>
                        </Link>
                        <div className="flex justify-between items-end">
                          <div>
                            <div className="text-gray-400 text-xs line-through">
                              {deal.regular_price} kr
                            </div>
                            <div className="text-lg font-extrabold text-red-600">
                              {deal.price} kr
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              addToBasket({
                                id: deal.id,
                                name: deal.name,
                                ean: "",
                                image_url: deal.image_url,
                                prices: [{ price: deal.price, store: deal.store, url: deal.url }],
                              } as any);
                              toast.success("Tillagd i din lista!");
                            }}
                            className="bg-blue-50 text-blue-600 w-9 h-9 flex items-center justify-center rounded-full hover:bg-blue-600 hover:text-white transition shadow-sm"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M5 12h14" />
                              <path d="M12 5v14" />
                            </svg>
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

        {/* SÖKRESULTAT */}
        {(searchResults.length > 0 || (queryFromUrl.length > 1 && !loading)) && (
          <div className="space-y-4 max-w-3xl mx-auto animate-fade-in-up pt-4">
            <h2 className="text-lg md:text-xl font-bold text-slate-700 mb-4">
              {searchResults.length > 0 ? `Sökresultat för "${queryFromUrl}"` : `Inga träffar för "${queryFromUrl}"`}
            </h2>
            {searchResults.map((p) => (
              <div
                key={p.id}
                className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-100 flex gap-3 md:gap-5 items-center hover:shadow-md transition group"
              >
                <Link
                  href={createProductUrl(p.id, p.slug, p.name, p.category?.slug)}
                  className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 rounded-lg relative flex-shrink-0"
                >
                  <ProductImage
                    src={p.image_url}
                    alt={p.name}
                    fill
                    className="object-contain mix-blend-multiply p-1 md:p-2 group-hover:scale-105 transition"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <Link
                    href={createProductUrl(p.id, p.slug, p.name, p.category?.slug)}
                    className="block"
                  >
                    <h3 className="font-bold text-slate-800 text-sm md:text-base hover:text-blue-600 truncate transition">
                      {p.name}
                    </h3>
                  </Link>
                  <p className="text-blue-600 font-bold mt-0.5 md:mt-1 text-xs md:text-sm">
                    Från {Math.min(...p.prices.map((x) => x.price))} kr
                  </p>
                </div>
                <button
                  onClick={() => {
                    addToBasket(p);
                    toast.success(`${p.name} har lagts till i listan!`);
                  }}
                  className="bg-blue-600 text-white px-3 py-1 md:px-4 md:py-1.5 rounded-full font-bold hover:bg-blue-700 transition shadow-md hover:shadow-lg text-xs md:text-sm whitespace-nowrap"
                >
                  + Lägg till
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// Wrapper för Suspense
export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50"></div>}>
      <HomeContent />
    </Suspense>
  )
}