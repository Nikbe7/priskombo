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
import {
  Heart,
  Shirt,
  Home as HomeIcon,
  Monitor,
  Baby,
  Dumbbell,
  Hammer,
  PawPrint,
  Car,
  UtensilsCrossed,
  Briefcase,
  Recycle,
  Flame,
} from "lucide-react";

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

  const categoryIcons = [
    { name: "Skönhet & Hälsa", icon: Heart },
    { name: "Kläder & Accessoarer", icon: Shirt },
    { name: "Hem & Hushåll", icon: HomeIcon },
    { name: "Teknik & Datorer", icon: Monitor },
    { name: "Barn & Familj", icon: Baby },
    { name: "Sport & Fritid", icon: Dumbbell },
    { name: "Bygg & Trädgård", icon: Hammer },
    { name: "Husdjur", icon: PawPrint },
    { name: "Fordon & Tillbehör", icon: Car },
    { name: "Mat & Dryck", icon: UtensilsCrossed },
    { name: "Kontor & Företag", icon: Briefcase },
    { name: "Begagnade produkter", icon: Recycle },
  ];

  useEffect(() => {
    fetch(`${API_URL}/categories`)
      .then((res) => {
        if (!res.ok)
          throw new Error(`Kunde inte hämta kategorier: ${res.status}`);
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
        const res = await fetch(
          `${API_URL}/search?q=${encodeURIComponent(queryFromUrl)}`,
        );
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
    <div className="min-h-screen bg-white">
      {/* HERO */}
      {queryFromUrl.length === 0 && (
        <section className="relative bg-gradient-to-b from-blue-100 to-transparent py-6 md:py-8 px-4 text-center select-none">
          {/* Decorative Shapes */}
          <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-100 to-blue-200/50 blur-3xl opacity-60"></div>
          <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-gradient-to-tl from-blue-100 to-cyan-100/50 blur-3xl opacity-50"></div>
          <div className="max-w-4xl mx-auto relative z-10">
            <h1 className="text-2xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-2 md:mb-3 leading-tight">
              Spara pengar på <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                varje köp
              </span>
            </h1>
            <p className="text-xs md:text-base text-slate-500 mb-2 max-w-xl mx-auto leading-relaxed px-2">
              Sök, kombinera och optimera. Vi hittar den billigaste lösningen
              för hela din inköpslista.
            </p>
          </div>
        </section>
      )}

      {/* RENDER CATEGORIES OUTSIDE MAIN WHEN NO SEARCH */}
      {searchResults.length === 0 && !loading && queryFromUrl.length === 0 && (
        <div className="px-3 md:px-8 max-w-[1600px] mx-auto">
          <section className="animate-fade-in-up mt-8 relative z-20">
            <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 text-slate-800 flex items-center gap-2 px-1">
              <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
              Utforska kategorier
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 relative z-10">
              {/* 1. KAMPANJER */}
              <div
                className="relative group p-3 border bg-white rounded-xl flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer h-24 hover:shadow-lg hover:border-red-300 select-none"
                onClick={() => router.push(`/deals`)}
              >
                <Flame className="w-8 h-8 text-red-500 mb-2 transition-transform duration-200 group-hover:scale-110" />
                <span className="text-sm font-bold text-slate-700 leading-tight flex items-center justify-center">
                  Kampanjer
                </span>
              </div>

              {/* 2. HUVUDKATEGORIER */}
              {rootCategories.map((root) => {
                const subs = getSubCategories(root.id);
                const isComingSoon = root.coming_soon;
                const Icon = categoryIcons.find(
                  (ci) => ci.name === root.name,
                )?.icon;

                return (
                  <div
                    key={root.id}
                    className={`relative group p-3 border bg-white rounded-xl flex flex-col items-center justify-center text-center transition-all duration-300 h-24 select-none ${
                      isComingSoon
                        ? "opacity-60 cursor-default"
                        : "cursor-pointer hover:shadow-lg hover:border-blue-300"
                    }`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('.dropdown-menu')) return;
                      if (!isComingSoon) router.push(`/${root.slug}`);
                    }}
                  >
                    {Icon && (
                      <Icon className="w-8 h-8 text-blue-500 mb-2 transition-transform duration-200 group-hover:scale-110" />
                    )}
                    
                    <span className="text-sm font-bold text-slate-700 leading-tight flex items-center justify-center">
                      {root.name}
                    </span>

                    {isComingSoon && (
                      <div className="absolute top-1.5 right-1.5 bg-slate-800 text-white text-[7px] font-bold px-1.5 py-0.5 rounded-full">
                        SNART
                      </div>
                    )}

                    {/* Hover-meny (Dropdown) */}
                    {!isComingSoon && (
                      <div
                        className="dropdown-menu absolute left-0 top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-blue-100 z-50 flex flex-col 
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
                          <span className="text-[10px] text-blue-600 font-bold">
                            →
                          </span>
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
                            <span className="block px-3 py-2 text-xs text-slate-400 italic text-center">
                              Inga underkategorier
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      <main className="px-3 py-2 md:p-8 max-w-[1600px] mx-auto">
        {/* START-VY */}
        {searchResults.length === 0 &&
          !loading &&
          queryFromUrl.length === 0 && (
            <div className="space-y-4 md:space-y-6 animate-fade-in-up">
              {/* DEALS SEKTION */}
              {homeDeals.length > 0 && (
                <section>
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
                            href={createProductUrl(
                              deal.id,
                              deal.slug,
                              deal.name,
                            )}
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
        {queryFromUrl.length > 1 && (
          <div className="space-y-4 max-w-3xl mx-auto animate-fade-in-up">
            <h2 className="text-lg md:text-xl font-bold text-slate-700 mb-4">
              {loading
                ? `Söker efter "${queryFromUrl}"...`
                : searchResults.length > 0
                  ? `Sökresultat för "${queryFromUrl}"`
                  : `Inga träffar för "${queryFromUrl}"`}
            </h2>
            {loading
              ? [...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex gap-5 items-center animate-pulse"
                  >
                    <div className="w-16 h-16 bg-slate-200 rounded-lg"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                    <div className="w-24 h-9 bg-slate-200 rounded-full"></div>
                  </div>
                ))
              : searchResults.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-100 flex gap-3 md:gap-5 items-center hover:shadow-md transition group"
                  >
                    <Link
                      href={createProductUrl(
                        p.id,
                        p.slug,
                        p.name,
                        p.category?.slug,
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
                          p.category?.slug,
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
  );
}