"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { fetchCategories } from "@/services/categories";
import { searchProducts } from "@/services/products";
import { fetchDeals } from "@/services/deals";
import { toast } from "sonner";
import type { Category } from "@/types/category";
import type { Product } from "@/types/product";
import type { Deal } from "@/types/deal";

import HeroSection from "@/components/home/HeroSection";
import CategoryGrid from "@/components/home/CategoryGrid";
import DealsSection from "@/components/home/DealsSection";
import SearchResults from "@/components/home/SearchResults";

function HomeContent() {
  const searchParams = useSearchParams();
  const queryFromUrl = searchParams.get("q") || "";
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [homeDeals, setHomeDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCategories()
      .then((data) => setCategories(data))
      .catch((err) => {
        console.error(err);
        setCategories([]);
      });

    fetchDeals(4)
      .then((data) => setHomeDeals(data))
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
        const data = await searchProducts(queryFromUrl);
        setSearchResults(data);
      } catch (err) {
        console.error(err);
        toast.error("Kunde inte hämta sökresultat.");
      }
      setLoading(false);
    };
    performSearch();
  }, [queryFromUrl]);

  const isDefaultView = searchResults.length === 0 && !loading && queryFromUrl.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* HERO */}
      {queryFromUrl.length === 0 && <HeroSection />}

      {/* KATEGORIER */}
      {isDefaultView && <CategoryGrid categories={categories} />}

      <main className="px-3 py-2 md:p-8 max-w-[1600px] mx-auto">
        {/* DEALS */}
        {isDefaultView && (
          <div className="space-y-4 md:space-y-6 animate-fade-in-up">
            <DealsSection deals={homeDeals} />
          </div>
        )}

        {/* SÖKRESULTAT */}
        <SearchResults query={queryFromUrl} results={searchResults} loading={loading} />
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