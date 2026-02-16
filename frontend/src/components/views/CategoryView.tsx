"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import API_URL from "@/lib/config";
import { useCart } from "@/context/CartContext";
import { createProductUrl } from "@/lib/utils";
import ProductImage from "@/components/ProductImage";
import ProductCardSkeleton from "@/components/skeletons/ProductCardSkeleton";
import { toast } from "sonner";
import { ArrowLeft, PackageOpen } from "lucide-react";

// --- KOMPONENTER ---

const SubCategoryLinks = ({
  currentSlug,
  subCategories,
  activeSlug,
}: {
  currentSlug: string;
  subCategories: any[];
  activeSlug: string;
}) => {
  if (subCategories.length === 0) return null;

  return (
    <>
      {/* Mobile: horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden -mx-3 px-3 scrollbar-none">
        {subCategories.map((sub: any) => (
          <Link
            key={sub.id}
            href={`/${currentSlug}/${sub.slug}`}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              activeSlug === sub.slug
                ? "bg-blue-100 text-blue-700 border-blue-200"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {sub.name}
          </Link>
        ))}
      </div>
      {/* Desktop: vertical sidebar */}
      <div className="hidden lg:block space-y-2">
        <h3 className="font-bold text-lg mb-2">Underkategorier</h3>
        {subCategories.map((sub: any) => (
          <Link
            key={sub.id}
            href={`/${currentSlug}/${sub.slug}`}
            className={`block p-2 rounded-md text-sm transition-colors ${
              activeSlug === sub.slug
                ? "bg-blue-100 text-blue-700 font-bold"
                : "hover:bg-slate-100 text-slate-600"
            }`}
          >
            {sub.name}
          </Link>
        ))}
      </div>
    </>
  );
};

// --- MAIN COMPONENT ---

export default function CategoryView() {
  const params = useParams();
  const slugPath = params.slug as string[];

  const currentSlug = slugPath ? slugPath[slugPath.length - 1] : "";
  const parentSlug =
    slugPath && slugPath.length > 1 ? slugPath[slugPath.length - 2] : null;

  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToBasket } = useCart();

  const currentSort = searchParams.get("sort") || "popularity";
  const currentSearch = searchParams.get("search") || "";

  const [categoryInfo, setCategoryInfo] = useState<any>(null);
  const [parentCategory, setParentCategory] = useState<any>(null);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const LIMIT = 50;

  const observer = useRef<IntersectionObserver | null>(null);

  const lastProductElementRef = useCallback(
    (node: HTMLDivElement) => {
      if (loadingMore) return;
      if (observer.current) observer.current.disconnect();

      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((prevPage) => prevPage + 1);
        }
      });

      if (node) observer.current.observe(node);
    },
    [loadingMore, hasMore]
  );

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

        const foundCategory = allCategories.find(
          (c: any) => c.slug === currentSlug
        );

        if (!foundCategory) {
          setLoadingInitial(false);
          return;
        }

        setCategoryInfo(foundCategory);

        if (foundCategory.parent_id) {
          const parent = allCategories.find(
            (c: any) => c.id === foundCategory.parent_id
          );
          setParentCategory(parent || null);
        } else {
          setParentCategory(null);
        }

        const children = allCategories.filter(
          (c: any) => c.parent_id === foundCategory.id
        );
        setSubCategories(children);

        setLoadingInitial(false);
      } catch (err) {
        console.error(err);
        setLoadingInitial(false);
      }
    };

    fetchCategoryStructure();
  }, [currentSlug]);

  useEffect(() => {
    if (!categoryInfo) return;

    const fetchProducts = async () => {
      setLoadingMore(true);
      try {
        const idsToFetch = [
          categoryInfo.id,
          ...subCategories.map((c: any) => c.id),
        ];

        const query = new URLSearchParams();
        idsToFetch.forEach((id) => query.append("category_ids", id.toString()));

        query.set("skip", ((page - 1) * LIMIT).toString());
        query.set("limit", LIMIT.toString());

        if (currentSearch) query.set("search", currentSearch);
        if (currentSort !== "popularity") query.set("sort", currentSort);

        const res = await fetch(`${API_URL}/products/?${query.toString()}`);

        const responseData = await res.json();

        setTotalCount(responseData.total);
        const newProducts = responseData.data;

        setProducts((prev) => {
          if (page === 1) return newProducts;
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNew = newProducts.filter(
            (p: any) => !existingIds.has(p.id)
          );
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
    Object.keys(updates).forEach((key) => {
      const value = updates[key];
      if (!value) newParams.delete(key);
      else newParams.set(key, value.toString());
    });
    router.push(`/${slugPath.join("/")}?${newParams.toString()}`);

    if (updates.sort) {
      setPage(1);
      setHasMore(true);
      setProducts([]);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-white pt-6 md:pt-8 pb-32 px-3 md:px-8 font-sans">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 md:mb-8 space-y-3">
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 md:h-10 w-48 md:w-64 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-4">
                {[...Array(4)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!categoryInfo)
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        Kategorin hittades inte.
      </div>
    );

  return (
    <div className="min-h-screen bg-white pt-6 md:pt-8 pb-24 px-3 md:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <div className="text-xs md:text-sm text-gray-500 mb-2 flex flex-wrap items-center gap-1 md:gap-2">
            <Link href="/" className="hover:text-blue-600">
              Start
            </Link>
            <span>/</span>
            {parentCategory && (
              <>
                <Link
                  href={`/${parentCategory.slug}`}
                  className="hover:text-blue-600 capitalize"
                >
                  {parentCategory.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-gray-900 font-medium capitalize">
              {categoryInfo.name}
            </span>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 md:gap-4">
            <div>
              <h1 className="text-xl md:text-4xl font-extrabold text-gray-900 leading-tight">
                {categoryInfo.name}
              </h1>
              <p className="text-xs md:text-sm text-gray-500 mt-1">
                Visar {products.length} av {totalCount} produkter
              </p>
            </div>
            <select
              value={currentSort}
              onChange={(e) => updateParams({ sort: e.target.value })}
              className="hidden md:block w-auto p-2 rounded-lg border border-gray-300 bg-white text-sm font-medium focus:border-blue-500 outline-none cursor-pointer shadow-sm"
            >
              <option value="popularity">Populärast</option>
              <option value="price_asc">Pris (Lågt - Högt)</option>
              <option value="price_desc">Pris (Högt - Lågt)</option>
              <option value="rating_desc">Betyg</option>
              <option value="name_asc">Namn (A-Ö)</option>
            </select>
          </div>
        </div>

        {/* Mobile: sticky subcategories + sort + back link */}
        <div className="md:hidden sticky top-16 z-20 bg-white -mx-3 px-3 py-2 space-y-2 border-b border-gray-100">
          {parentCategory && (
            <Link
              href={`/${parentCategory.slug}`}
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Tillbaka till {parentCategory.name}
            </Link>
          )}
          {subCategories.length > 0 && (
            <SubCategoryLinks
              currentSlug={parentSlug || categoryInfo.slug}
              subCategories={subCategories}
              activeSlug={currentSlug}
            />
          )}
          <select
            value={currentSort}
            onChange={(e) => updateParams({ sort: e.target.value })}
            className="w-full p-2 rounded-lg border border-gray-300 bg-white text-sm font-medium focus:border-blue-500 outline-none cursor-pointer shadow-sm"
          >
            <option value="popularity">Populärast</option>
            <option value="price_asc">Pris (Lågt - Högt)</option>
            <option value="price_desc">Pris (Högt - Lågt)</option>
            <option value="rating_desc">Betyg</option>
            <option value="name_asc">Namn (A-Ö)</option>
          </select>
        </div>

        {/* Desktop: subcategories shown in sidebar (handled below) */}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-12">
          {/* Left Sidebar: Sub-categories (desktop only) */}
          <aside className="hidden lg:block lg:w-60">
            <div className="sticky top-24">
              <SubCategoryLinks
                currentSlug={parentSlug || categoryInfo.slug}
                subCategories={subCategories}
                activeSlug={currentSlug}
              />
            </div>
          </aside>

          {/* Right Content: Products */}
          <div className="flex-1">
            {products.length === 0 && !loadingMore ? (
              <div className="text-center py-12 md:py-20 bg-white rounded-xl border border-dashed border-gray-300 flex flex-col items-center gap-3">
                <PackageOpen className="w-10 h-10 text-gray-300" />
                <p className="text-gray-500">Inga produkter hittades i denna kategori.</p>
                <Link
                  href="/"
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                >
                  Utforska alla kategorier →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-4">
                {products.map((p: any, index: number) => {
                  const minPrice =
                    p.prices && p.prices.length > 0
                      ? Math.min(...p.prices.map((x: any) => x.price))
                      : 0;
                  
                  const productUrl = createProductUrl(
                    p.id,
                    p.slug,
                    p.name,
                    categoryInfo.slug
                  );

                  const content = (
                    <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition group h-full">
                      <Link href={productUrl} className="block relative flex-1">
                        <div className="h-32 md:h-48 bg-gray-50 rounded-lg flex items-center justify-center p-2 md:p-4 mb-3 md:mb-4 relative overflow-hidden">
                          <ProductImage
                            src={p.image_url}
                            alt={p.name}
                            className="max-h-full object-contain mix-blend-multiply group-hover:scale-105 transition duration-300"
                          />
                          {p.rating > 0 && (
                            <span className="absolute bottom-1 left-1 md:bottom-2 md:left-2 bg-white/90 px-1.5 py-0.5 md:px-2 md:py-1 rounded text-[10px] md:text-xs font-bold text-yellow-600 shadow-sm flex items-center gap-1">
                              ⭐ {p.rating}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-800 text-xs md:text-sm leading-snug mb-1 md:mb-2 group-hover:text-blue-600 line-clamp-2 min-h-[2.5em]">
                          {p.name}
                        </h3>
                      </Link>

                      <div className="mt-auto pt-2 md:pt-4 border-t border-gray-50 flex justify-between items-end">
                        <div>
                          <p className="text-blue-600 font-extrabold text-sm md:text-lg">
                            {minPrice} kr
                          </p>
                          <p className="text-[10px] md:text-xs text-gray-400">
                            {p.prices?.length || 0} butiker
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            addToBasket(p);
                            toast.success(`${p.name} har lagts till i listan!`);
                          }}
                          className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition font-bold shadow-sm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );

                  if (products.length === index + 1) {
                    return (
                      <div ref={lastProductElementRef} key={p.id}>
                        {content}
                      </div>
                    );
                  } else {
                    return <div key={p.id}>{content}</div>;
                  }
                })}
              </div>
            )}

            {loadingMore && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-4 mt-4">
                {[...Array(4)].map((_, i) => (
                  <ProductCardSkeleton key={`loading-${i}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}