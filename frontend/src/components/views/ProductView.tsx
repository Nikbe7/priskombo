"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import ProductImage from "@/components/ProductImage";
import { toast } from "sonner";
import { ExternalLink, Check, ShoppingBag } from "lucide-react";
import { useMemo } from "react";

type CategoryLink = {
  name: string;
  slug: string;
  parent?: CategoryLink | null;
};

type ProductDetails = {
  id: number;
  name: string;
  ean: string;
  slug: string | null;
  image_url: string | null;
  category: CategoryLink | null;
  prices: {
    store: string;
    price: number;
    regular_price?: number;
    discount_percent?: number;
    url: string;
    shipping?: number;
  }[];
};

export default function ProductView({ product }: { product: ProductDetails }) {
  const { addToBasket } = useCart();
  const router = useRouter();
  const [includeShipping, setIncludeShipping] = useState(false);

  // --- Start Price Logic ---

  // The price displayed at the top. Always shows the lowest item price for consistency.
  const lowestItemPrice = useMemo(() => {
    if (!product.prices || product.prices.length === 0) return 0;
    // Use reduce to find the minimum price
    return product.prices.reduce((min, p) => (p.price < min ? p.price : min), Infinity);
  }, [product.prices]);

  // Sort prices based on the toggle state
  const sortedPrices = useMemo(() => {
    return [...product.prices].sort((a, b) => {
      if (includeShipping) {
        const totalA = a.price + (a.shipping ?? Infinity);
        const totalB = b.price + (b.shipping ?? Infinity);
        return totalA - totalB;
      }
      return a.price - b.price;
    });
  }, [product.prices, includeShipping]);
  
  // --- End Price Logic ---

  const renderBreadcrumbs = (
    cat: CategoryLink | null | undefined
  ): React.ReactNode => {
    if (!cat) return null;
    return (
      <>
        {cat.parent && renderBreadcrumbs(cat.parent)}
        <Link
          href={`/${cat.slug}`}
          className="hover:text-blue-600 hover:underline capitalize"
        >
          {cat.name}
        </Link>
        <span className="mx-2 text-gray-400">/</span>
      </>
    );
  };

  const handleAddToCart = () => {
    addToBasket({
      id: product.id,
      name: product.name,
      ean: product.ean,
      image_url: product.image_url,
      prices: product.prices,
    } as any);

    toast.success(`${product.name} har lagts till i din lista!`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 pt-36 font-sans">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        
        {/* Breadcrumbs */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 flex items-center flex-wrap gap-x-1.5">
              <Link href="/" className="hover:text-blue-600 hover:underline">
              Start
              </Link>
              <span className="text-gray-400">/</span>
              {product.category ? (
              renderBreadcrumbs(product.category)
              ) : (
              <span>Okategoriserad /</span>
              )}
              <span className="text-gray-900 font-medium truncate">
              {product.name}
              </span>
          </div>
        </div>

        {/* --- ENHETLIGT PRODUKTKORT --- */}
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-12">
            
            {/* GRUNDINFO (BILD & KÖP) */}
            <div className="grid grid-cols-1 md:grid-cols-2">
            
                {/* BILD */}
                <div className="bg-white md:bg-gray-50 p-6 md:p-10 flex items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 relative">
                    <div className="relative w-full h-48 md:h-72">
                        {product.image_url ? (
                            <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-contain mix-blend-multiply"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-6xl">📦</div>
                        )}
                    </div>
                </div>

                {/* INFO */}
                <div className="p-4 md:p-8 flex flex-col justify-center" data-testid="product-main-info">
                    <h1 className="text-xl md:text-3xl font-extrabold text-gray-900 mb-2 md:mb-4 leading-tight">
                    {product.name}
                    </h1>

                    <div className="flex flex-row items-center gap-3 md:gap-4 mb-4 md:mb-6">
                        <span className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                            {lowestItemPrice} kr
                        </span>
                        <span className="text-[10px] md:text-sm text-gray-500 bg-gray-100 px-2 py-1 md:px-3 md:py-1 rounded-full w-fit">
                            {product.prices.length} butiker
                        </span>
                    </div>

                    <button
                        onClick={handleAddToCart}
                        className="w-full bg-slate-900 text-white font-bold py-3 md:py-3.5 rounded-xl hover:bg-blue-600 transition shadow-lg hover:shadow-xl transform active:scale-[0.98] mb-2 flex items-center justify-center gap-2"
                    >
                        <ShoppingBag className="w-5 h-5" /> 
                        <span>Lägg till i inköpslistan</span>
                    </button>

                    {product.ean && (
                        <div className="text-[10px] md:text-xs text-gray-400 font-mono mt-1 text-center md:text-left">
                            EAN: {product.ean}
                        </div>
                    )}
                </div>
            </div>

            {/* PRISLISTA (nu en del av kortet) */}
            <div className="border-t border-gray-100">
                <div className="p-4 md:p-6 bg-gray-50/70 flex items-center gap-6">
                    <h3 className="font-bold text-gray-800 text-base md:text-lg">
                        Jämför priser
                    </h3>
                    <label htmlFor="shipping-toggle" className="flex items-center cursor-pointer">
                        <span className="mr-3 text-sm font-medium text-gray-700">Inkludera frakt</span>
                        <div className="relative">
                            <input id="shipping-toggle" type="checkbox" className="sr-only" checked={includeShipping} onChange={e => setIncludeShipping(e.target.checked)} />
                            <div className={`block w-12 h-7 rounded-full transition-colors ${includeShipping ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-5 h-5 rounded-full shadow-md transition-transform ${includeShipping ? 'translate-x-5' : ''}`}></div>
                        </div>
                    </label>
                </div>
                <div className="divide-y divide-gray-100">
                {sortedPrices.map((offer, idx) => (
                    <div
                    key={offer.store}
                    data-testid="price-offer"
                    className="flex flex-row justify-between items-center p-3 md:p-4 hover:bg-blue-50/50 transition gap-2"
                    >
                    {/* Vänster: Butik */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-100 rounded-lg flex items-center justify-center text-sm md:text-lg font-bold text-gray-600 uppercase flex-shrink-0">
                            {offer.store.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-gray-900 text-sm md:text-base truncate">{offer.store}</span>
                                {idx === 0 && (
                                    <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap">
                                    Bäst pris
                                    </span>
                                )}
                            </div>
                            {includeShipping && (
                                <div className="text-[10px] md:text-xs text-gray-500 truncate mt-0.5">
                                    {offer.shipping !== undefined
                                        ? offer.shipping === 0
                                        ? "Fri frakt"
                                        : `+ ${offer.shipping} kr frakt`
                                        : "Frakt okänd"}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Höger: Pris & Knapp */}
                    <div className="flex items-center gap-3 md:gap-4 text-right flex-shrink-0">
                        <div>
                            <div className="font-bold text-sm md:text-base text-gray-900 whitespace-nowrap">
                                {offer.price} kr
                            </div>
                            {offer.regular_price && offer.regular_price > offer.price && (
                                <div className="text-[10px] md:text-xs text-gray-400 line-through">
                                {offer.regular_price} kr
                                </div>
                            )}
                        </div>

                        <a
                            href={offer.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center w-8 h-8 md:w-auto md:h-auto md:px-3 md:py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:border-blue-500 hover:text-blue-600 transition shadow-sm"
                        >
                            <ExternalLink className="w-3.5 h-3.5 md:mr-1.5" />
                            <span className="hidden md:inline">Till butik</span>
                        </a>
                    </div>
                    </div>
                ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}