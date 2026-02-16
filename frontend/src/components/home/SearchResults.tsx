"use client";
import Link from "next/link";
import ProductImage from "@/components/product/ProductImage";
import { createProductUrl } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import type { Product } from "@/types/product";

interface SearchResultsProps {
  query: string;
  results: Product[];
  loading: boolean;
}

export default function SearchResults({ query, results, loading }: SearchResultsProps) {
  const { addToBasket } = useCart();

  if (query.length <= 1) return null;

  return (
    <div className="space-y-4 max-w-3xl mx-auto animate-fade-in-up">
      <h2 className="text-lg md:text-xl font-bold text-slate-700 mb-4">
        {loading
          ? `Söker efter "${query}"...`
          : results.length > 0
            ? `Sökresultat för "${query}"`
            : `Inga träffar för "${query}"`}
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
        : results.map((p) => (
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
  );
}
