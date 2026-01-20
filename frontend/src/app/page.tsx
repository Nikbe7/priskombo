"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import API_URL from "@/lib/config";
import { useCart } from "@/context/CartContext";
import ProductImage from "@/components/ProductImage";
import { createProductUrl } from "@/lib/utils";
import { toast } from "sonner";

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
  const searchParams = useSearchParams(); // Hämta URL params
  
  // Hämta 'q' från URL:en
  const queryFromUrl = searchParams.get("q") || "";

  // Ta bort lokalt "query" state för input, använd queryFromUrl för sökning
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [homeDeals, setHomeDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);

  const { addToBasket } = useCart();

  useEffect(() => {
    // Hämta kategorier säkert
    fetch(`${API_URL}/categories`)
      .then((res) => {
        if (!res.ok) throw new Error(`Kunde inte hämta kategorier: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          setCategories([]); 
        }
      })
      .catch((err) => {
        console.error(err);
        setCategories([]);
      });

    // Hämta deals
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

  // Lyssna på queryFromUrl istället för debouncedQuery
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
      {/* HERO - Ännu tajtare padding bottom (pb-2 på mobil) */}
      <section className="relative bg-gradient-to-b from-blue-50 to-white pt-32 pb-2 md:pt-28 md:pb-8 px-4 text-center">
        <div className="max-w-4xl mx-auto relative z-10">
          <h1 className="text-2xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-2 md:mb-3 leading-tight">
            Spara pengar på <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              varje köp
            </span>
          </h1>
          {/* Minskad marginal (mb-2) */}
          <p className="text-xs md:text-base text-slate-500 mb-2 max-w-xl mx-auto leading-relaxed px-2">
            Sök, kombinera och optimera. Vi hittar den billigaste lösningen för
            hela din inköpslista.
          </p>
          
          {/* Laddningsindikator */}
          {loading && (
             <div className="max-w-md mx-auto mt-4 p-3 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center gap-3 animate-pulse">
                <div className="w-5 h-5 bg-gray-200 rounded-full"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
             </div>
          )}
        </div>
      </section>

      {/* Minskad top-padding på main (py-2 på mobil) */}
      <main className="px-4 py-2 md:p-8 max-w-[1600px] mx-auto">
        {/* START-VY */}
        {searchResults.length === 0 && !loading && queryFromUrl.length === 0 && (
          <div className="space-y-8 md:space-y-16 animate-fade-in-up">
            {/* KATEGORI-GRID */}
            <section>
              <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-6 text-slate-800 flex items-center gap-2">
                <span className="w-1 h-6 bg-blue-600 rounded-full"></span>
                Utforska kategorier
              </h2>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {/* 1. KAMPANJER */}
                <Link
                  href="/deals"
                  className="relative group bg-gradient-to-br from-red-500 to-rose-600 rounded-xl p-3 shadow-md shadow-red-100 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex flex-col items-center justify-center h-24 md:h-28 text-white overflow-hidden"
                >
                  <div className="text-2xl md:text-3xl mb-1 transform group-hover:scale-110 transition duration-300">
                    🔥
                  </div>
                  <h3 className="text-xs md:text-sm font-bold">Kampanjer</h3>
                  <p className="opacity-90 text-[10px] font-medium uppercase tracking-wide">
                    Fynda nu
                  </p>
                </Link>

                {/* 2. HUVUDKATEGORIER */}
                {rootCategories.map((root) => {
                  const subs = getSubCategories(root.id);
                  const isComingSoon = root.coming_soon;

                  return (
                    <div
                      key={root.id}
                      onClick={() =>
                        !isComingSoon && router.push(`/${root.slug}`)
                      }
                      className={`relative group bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 h-24 md:h-28 flex flex-col items-center justify-center cursor-pointer overflow-visible ${
                        isComingSoon
                          ? "opacity-60 cursor-default bg-slate-50"
                          : ""
                      }`}
                    >
                      <div
                        className={`peer h-full w-full flex flex-col items-center justify-center z-10 transition-all duration-300 ${
                          !isComingSoon ? "hover:-translate-y-1" : ""
                        }`}
                      >
                        <div className="text-xl md:text-2xl mb-2 text-slate-400 peer-hover:text-slate-500 transition-colors">
                          📦
                        </div>
                        <h3 className="font-bold text-slate-700 text-xs md:text-sm text-center px-1 leading-tight group-hover:text-blue-700">
                          {root.name}
                        </h3>
                        {isComingSoon && (
                          <span className="text-[9px] uppercase font-bold text-slate-400 mt-1 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                            Snart
                          </span>
                        )}
                      </div>

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
                            <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wide">
                              Gå till kategori
                            </span>
                            <span className="text-[10px] text-blue-600 font-bold">
                              →
                            </span>
                          </div>

                          <div className="p-1 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                            {subs.map((sub) => (
                              <Link
                                key={sub.id}
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

            {/* DEALS */}
            {homeDeals.length > 0 && (
              <section className="pt-6 md:pt-8 border-t border-slate-100">
                <div className="flex justify-between items-end mb-4 md:mb-6">
                  <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1 h-6 bg-red-500 rounded-full"></span>
                    Heta Deals just nu
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
                      className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-lg transition-all duration-300 group relative"
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
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
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
                                prices: [
                                  {
                                    price: deal.price,
                                    store: deal.store,
                                    url: deal.url,
                                  },
                                ],
                              } as any);
                              toast.success("Tillagd i din lista!");
                            }}
                            className="bg-blue-50 text-blue-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-blue-600 hover:text-white transition shadow-sm"
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
                  href={createProductUrl(
                    p.id,
                    p.slug,
                    p.name,
                    p.category?.slug
                  )}
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
                    href={createProductUrl(
                      p.id,
                      p.slug,
                      p.name,
                      p.category?.slug
                    )}
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