"use client";
import Link from "next/link";
import ProductImage from "@/components/product/ProductImage";
import { createProductUrl } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import type { Deal } from "@/types/deal";

interface DealsSectionProps {
  deals: Deal[];
}

export default function DealsSection({ deals }: DealsSectionProps) {
  const { addToBasket } = useCart();

  if (deals.length === 0) return null;

  return (
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
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2.5 md:gap-4">
        {deals.map((deal) => (
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
              <div className="h-28 md:h-32 bg-slate-50 relative flex items-center justify-center p-3 md:p-4">
                <ProductImage
                  src={deal.image_url}
                  alt={deal.name}
                  fill
                  className="object-contain mix-blend-multiply group-hover:scale-105 transition duration-500"
                />
              </div>
            </Link>
            <div className="p-3 md:p-4">
              <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                {deal.store}
              </div>
              <Link
                href={createProductUrl(deal.id, deal.slug, deal.name)}
                className="block mb-2 hover:text-blue-600 transition"
              >
                <h3 className="font-bold text-slate-800 text-xs md:text-sm leading-snug line-clamp-2 h-8 md:h-10">
                  {deal.name}
                </h3>
              </Link>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-gray-400 text-xs line-through">
                    {deal.regular_price} kr
                  </div>
                  <div className="text-base md:text-lg font-extrabold text-red-600">
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
  );
}
