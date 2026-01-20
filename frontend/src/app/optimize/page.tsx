"use client";

import { useCart } from "@/context/CartContext";
import API_URL from "@/lib/config";
import { 
  ExternalLink, 
  CheckCircle, 
  RefreshCw, 
  Truck, 
  Package,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ProductImage from "@/components/ProductImage";

export default function OptimizePage() {
  const { basket, isInitialized, setIsCartOpen } = useCart();
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Öppna sidebaren automatiskt ENDAST på desktop (>= 640px)
  useEffect(() => {
    if (window.innerWidth >= 640) {
      setIsCartOpen(true);
    }
  }, [setIsCartOpen]);

  // Redirect om tom
  useEffect(() => {
    if (isInitialized && basket.length === 0) {
      router.push("/");
    }
  }, [basket, isInitialized, router]);

  // Hämta data
  useEffect(() => {
    if (!isInitialized || basket.length === 0) return;

    const fetchOptimization = async () => {
      setLoading(true);
      try {
        const items = basket.map((p) => ({
          product_id: p.id,
          quantity: p.quantity,
        }));

        const res = await fetch(`${API_URL}/optimize`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        } else {
            toast.error("Kunde inte optimera korgen just nu.");
        }
      } catch (err) {
        console.error(err);
        toast.error("Ett fel uppstod.");
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
        fetchOptimization();
    }, 500);

    return () => clearTimeout(timeoutId);

  }, [basket, isInitialized]);

  if (!isInitialized || basket.length === 0) return null;

  // Kolla om vi har samlad leverans
  const hasSingleShipment = results?.some(r => r.type === "Samlad leverans");

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24">
      {/* PADDING FÖR MOBIL: pt-36 säkerställer att innehållet syns under navbaren */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-36 md:pt-24 transition-all duration-300">
        
        {/* HEADER */}
        <div className="mb-6 md:mb-10 text-center animate-in fade-in slide-in-from-top-4 duration-700">
              <h1 className="text-2xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-2 md:mb-3">
                Ditt optimala köp
              </h1>
              <p className="text-slate-500 text-sm md:text-lg max-w-2xl mx-auto leading-relaxed px-2">
                Vi har analyserat fraktvillkor och priser för att hitta den billigaste kombinationen.
              </p>
        </div>

        {/* LOADING STATE */}
        {loading && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 md:p-16 text-center animate-pulse max-w-3xl mx-auto">
                <RefreshCw className="w-10 h-10 md:w-16 md:h-16 text-blue-600 animate-spin mx-auto mb-4 md:mb-6" />
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Räknar ut bästa pris...</h3>
                <p className="text-sm md:text-base text-slate-500">Jämför butiker och fraktvillkor.</p>
            </div>
        )}

        {/* RESULTAT LISTA */}
        <div className="space-y-6 md:space-y-10 max-w-4xl mx-auto">
            
            {/* Varningsruta om samlad leverans saknas */}
            {!loading && results && results.length > 0 && !hasSingleShipment && (
                <div className="flex items-start md:items-center justify-center gap-3 text-amber-700 bg-amber-50 border border-amber-100 px-4 py-3 rounded-2xl md:rounded-full w-full md:w-fit mx-auto text-xs md:text-sm mb-4">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 md:mt-0" />
                    <span className="font-medium">Obs: Ingen enskild butik har alla varor i lager.</span>
                </div>
            )}

            {!loading && results && results.map((option, idx) => (
                <div
                    key={idx}
                    className={`bg-white rounded-2xl md:rounded-3xl overflow-hidden transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 ${
                        idx === 0 
                        ? "shadow-xl shadow-green-900/10 ring-1 ring-green-500 border-green-500 relative" 
                        : "shadow-sm border border-slate-200"
                    }`}
                    style={{ animationDelay: `${idx * 100}ms` }}
                >
                    {/* BADGE FÖR BÄSTA VAL */}
                    {idx === 0 && (
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] md:text-sm font-bold px-3 py-1 md:px-4 md:py-1.5 rounded-bl-xl md:rounded-bl-2xl shadow-sm z-10 flex items-center gap-1.5">
                            <CheckCircle className="w-3 h-3 md:w-4 md:h-4" /> BÄSTA VAL
                        </div>
                    )}

                    {/* HEADER (TOTALT) */}
                    <div className={`p-5 md:p-10 border-b ${
                        option.type === "Samlad leverans" ? "bg-gradient-to-br from-green-50/50 to-white" : "bg-gradient-to-br from-blue-50/50 to-white"
                    }`}>
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-4 text-left">
                            <div className="flex-1 w-full">
                                <div className="flex items-center justify-between md:justify-start w-full gap-4 mb-2">
                                    <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider px-2 py-0.5 md:px-3 md:py-1 rounded-full ${
                                        option.type === "Samlad leverans" 
                                        ? "bg-green-100 text-green-800" 
                                        : "bg-blue-100 text-blue-800"
                                    }`}>
                                        {option.type}
                                    </span>
                                    
                                    {/* MOBIL: Butiksikoner (överlappande stack) */}
                                    <div className="flex md:hidden -space-x-2 overflow-hidden">
                                        {option.stores.slice(0, 4).map((store: string, i: number) => (
                                            <div key={i} className="relative z-0 hover:z-10 transition-all">
                                                <div className="w-8 h-8 bg-white rounded-full border border-slate-200 flex items-center justify-center font-bold text-slate-700 shadow-sm text-[10px] uppercase ring-2 ring-white">
                                                    {store.charAt(0)}
                                                </div>
                                            </div>
                                        ))}
                                        {option.stores.length > 4 && (
                                            <div className="relative z-0">
                                                <div className="w-8 h-8 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center font-bold text-slate-500 shadow-sm text-[10px] ring-2 ring-white">
                                                    +{option.stores.length - 4}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-baseline gap-2 md:gap-3">
                                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">
                                        {Math.round(option.total_cost)}:-
                                    </h2>
                                    <span className="text-slate-500 font-medium text-sm md:text-lg">totalt</span>
                                </div>
                            </div>

                            {/* DESKTOP: Butiksikoner (Separat rad) */}
                            <div className="hidden md:flex items-center gap-2 bg-white/80 p-1.5 rounded-xl border border-slate-100 shadow-sm self-start md:self-center">
                                {option.stores.map((store: string, i: number) => (
                                    <div key={i} className="flex flex-col items-center">
                                        <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center font-bold text-slate-700 shadow-sm text-lg uppercase" title={store}>
                                            {store.charAt(0)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* DETALJER (BUTIKER) */}
                    <div className="divide-y divide-slate-100">
                        {option.details.map((detail: any, i: number) => (
                            <div key={i} className="p-5 md:p-10">
                                {/* Butiks-header */}
                                <div className="flex flex-row justify-between items-center mb-4 md:mb-8 gap-3">
                                    <div className="flex items-center gap-3 md:gap-4">
                                        <div className="w-10 h-10 md:w-14 md:h-14 bg-slate-100 rounded-xl md:rounded-2xl flex items-center justify-center font-bold text-slate-600 text-lg md:text-2xl uppercase flex-shrink-0">
                                            {detail.store.charAt(0)}
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-lg md:text-2xl text-slate-900 leading-none">{detail.store}</h3>
                                            <div className="flex items-center gap-1.5 text-xs md:text-sm text-slate-500 mt-1">
                                                <Truck className="w-3 h-3 md:w-4 md:h-4" />
                                                {detail.shipping === 0 ? (
                                                    <span className="text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded">Fri frakt</span>
                                                ) : (
                                                    <span>{detail.shipping} kr frakt</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right bg-slate-50 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl">
                                        <div className="font-bold text-slate-900 text-sm md:text-xl">{Math.round(detail.products_cost + detail.shipping)} kr</div>
                                        <div className="text-[10px] md:text-xs text-slate-400 font-medium uppercase tracking-wide">Delbelopp</div>
                                    </div>
                                </div>

                                {/* PRODUKTER */}
                                <div className="bg-slate-50/50 rounded-xl md:rounded-2xl border border-slate-200/60 overflow-hidden">
                                    {detail.products.map((prod: any, pIdx: number) => {
                                        const originalItem = basket.find(b => 
                                            (prod.id && b.id === prod.id) || b.name === prod.name
                                        );
                                        const quantity = originalItem?.quantity || 1;
                                        const itemTotal = (prod.price || 0) * quantity;

                                        return (
                                            <div key={pIdx} className="flex flex-row items-center gap-3 md:gap-4 p-3 md:p-5 border-b border-slate-200/60 last:border-0 hover:bg-white transition-colors">
                                                
                                                {/* Bild */}
                                                <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-lg md:rounded-xl border border-slate-200 flex-shrink-0 flex items-center justify-center p-1 md:p-2 relative">
                                                    {originalItem?.image_url ? (
                                                       <ProductImage src={originalItem.image_url} alt="" className="object-contain mix-blend-multiply" fill />
                                                    ) : (
                                                        <Package className="w-6 h-6 md:w-8 md:h-8 text-slate-300" />
                                                    )}
                                                    {quantity > 1 && (
                                                        <span className="absolute -top-1.5 -right-1.5 md:-top-2 md:-right-2 bg-slate-900 text-white text-[10px] md:text-xs font-bold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full shadow-md ring-2 ring-white">
                                                            {quantity}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Namn & Pris */}
                                                <div className="flex-1 min-w-0 pr-2">
                                                    <Link href={`/${prod.slug}`} target="_blank" className="font-bold text-slate-900 hover:text-blue-600 truncate block text-sm md:text-base leading-tight">
                                                        {prod.name}
                                                    </Link>
                                                    <div className="flex justify-between items-center mt-1">
                                                        <p className="text-xs md:text-sm text-slate-500">
                                                            {quantity} st × {prod.price} kr
                                                        </p>
                                                        <div className="font-bold text-slate-900 text-sm md:text-lg md:hidden">
                                                            {Math.round(itemTotal)}:-
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Desktop Pris & Köpknapp */}
                                                <div className="hidden md:flex items-center gap-6">
                                                    <div className="text-right font-bold text-slate-900 text-lg">
                                                        {Math.round(itemTotal)}:-
                                                    </div>
                                                    {prod.url ? (
                                                        <a 
                                                            href={prod.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-blue-600 transition-all shadow-md hover:shadow-lg transform active:scale-95 whitespace-nowrap"
                                                        >
                                                            Till butik <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">Slut</span>
                                                    )}
                                                </div>

                                                {/* Mobil köpknapp */}
                                                <div className="md:hidden">
                                                     {prod.url ? (
                                                        <a 
                                                            href={prod.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-700 rounded-full hover:bg-blue-50 active:bg-blue-100"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                     ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}