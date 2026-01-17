"use client";

import { useCart } from "@/context/CartContext";
import API_URL from "@/lib/config";
import { 
  ExternalLink, 
  CheckCircle, 
  ArrowLeft, 
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

  // Öppna sidebaren automatiskt
  useEffect(() => {
    setIsCartOpen(true);
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
    <div className="min-h-screen bg-slate-50 font-sans">
      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6 md:pt-24 pb-20 transition-all duration-300">
        
        {/* HEADER */}
        <div className="mb-10 text-center">
              <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-3">
                Ditt optimala köp
              </h1>
              <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                Vi har analyserat fraktvillkor och priser för att hitta den absolut billigaste kombinationen för dina varor.
              </p>
        </div>

        {/* LOADING STATE */}
        {loading && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-16 text-center animate-pulse max-w-3xl mx-auto">
                <RefreshCw className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Räknar ut bästa pris...</h3>
                <p className="text-slate-500">Jämför tusentals priser åt dig just nu.</p>
            </div>
        )}

        {/* RESULTAT LISTA */}
        <div className="space-y-10 max-w-4xl mx-auto">
            
            {/* Varningsruta om samlad leverans saknas */}
            {!loading && results && results.length > 0 && !hasSingleShipment && (
                <div className="flex items-center justify-center gap-2 text-amber-700 bg-amber-50 border border-amber-100 px-4 py-2 rounded-full w-fit mx-auto text-sm mb-6">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">Obs: Ingen enskild butik har alla varor i lager.</span>
                </div>
            )}

            {!loading && results && results.map((option, idx) => (
                <div
                    key={idx}
                    className={`bg-white rounded-3xl overflow-hidden transition-all duration-300 ${
                        idx === 0 
                        ? "shadow-2xl shadow-green-900/10 ring-1 ring-green-500 border-green-500 relative transform hover:-translate-y-1" 
                        : "shadow-sm border border-slate-200 hover:shadow-lg opacity-90 hover:opacity-100"
                    }`}
                >
                    {/* BADGE FÖR BÄSTA VAL */}
                    {idx === 0 && (
                        <div className="absolute top-0 right-0 bg-green-500 text-white text-sm font-bold px-4 py-1.5 rounded-bl-2xl shadow-sm z-10 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> REKOMMENDERAT VAL
                        </div>
                    )}

                    {/* HEADER */}
                    <div className={`p-8 md:p-10 border-b ${
                        option.type === "Samlad leverans" ? "bg-gradient-to-r from-green-50 to-white" : "bg-gradient-to-r from-blue-50 to-white"
                    }`}>
                        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
                            <div>
                                <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                                    <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                                        option.type === "Samlad leverans" 
                                        ? "bg-green-100 text-green-800" 
                                        : "bg-blue-100 text-blue-800"
                                    }`}>
                                        {option.type}
                                    </span>
                                </div>
                                <div className="flex items-baseline justify-center md:justify-start gap-3">
                                    <h2 className="text-5xl font-black text-slate-900">
                                        {Math.round(option.total_cost)}:-
                                    </h2>
                                    <span className="text-slate-500 font-medium text-lg">totalt</span>
                                </div>
                            </div>

                            {/* Butiks-ikoner */}
                            <div className="flex items-center gap-3 bg-white/50 p-2 rounded-2xl border border-white/50 shadow-sm">
                                {option.stores.map((store: string, i: number) => (
                                    <div key={i} className="flex flex-col items-center p-2">
                                        <div className="w-12 h-12 bg-white rounded-full border border-slate-200 flex items-center justify-center font-bold text-slate-700 shadow-sm text-lg uppercase">
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
                            <div key={i} className="p-8 md:p-10">
                                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center font-bold text-slate-600 text-2xl uppercase">
                                            {detail.store.charAt(0)}
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-2xl text-slate-900">{detail.store}</h3>
                                            <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                                <Truck className="w-4 h-4" />
                                                {detail.shipping === 0 ? (
                                                    <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded">Fri frakt</span>
                                                ) : (
                                                    <span>{detail.shipping} kr frakt</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center md:text-right bg-slate-50 px-4 py-2 rounded-xl">
                                        <div className="font-bold text-slate-900 text-xl">{Math.round(detail.products_cost + detail.shipping)} kr</div>
                                        <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Delbelopp</div>
                                    </div>
                                </div>

                                {/* PRODUKTER */}
                                <div className="bg-slate-50/50 rounded-2xl border border-slate-200/60 overflow-hidden">
                                    {detail.products.map((prod: any, pIdx: number) => {
                                        const originalItem = basket.find(b => 
                                            (prod.id && b.id === prod.id) || b.name === prod.name
                                        );
                                        const quantity = originalItem?.quantity || 1;
                                        const itemTotal = (prod.price || 0) * quantity;

                                        return (
                                            <div key={pIdx} className="flex flex-col sm:flex-row items-center gap-4 p-5 border-b border-slate-200/60 last:border-0 hover:bg-white transition-colors">
                                                {/* Bild */}
                                                <div className="w-16 h-16 bg-white rounded-xl border border-slate-200 flex-shrink-0 flex items-center justify-center p-2 relative">
                                                    {originalItem?.image_url ? (
                                                       <ProductImage src={originalItem.image_url} alt="" className="object-contain mix-blend-multiply" fill />
                                                    ) : (
                                                        <Package className="w-8 h-8 text-slate-300" />
                                                    )}
                                                    {quantity > 1 && (
                                                        <span className="absolute -top-2 -right-2 bg-slate-900 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow-md ring-2 ring-white">
                                                            {quantity}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Namn */}
                                                <div className="flex-1 min-w-0 text-center sm:text-left w-full">
                                                    <Link href={`/${prod.slug}`} target="_blank" className="font-bold text-slate-900 hover:text-blue-600 truncate block text-base">
                                                        {prod.name}
                                                    </Link>
                                                    <p className="text-sm text-slate-500 mt-1">
                                                        {quantity} st × <span className="font-medium text-slate-700">{prod.price} kr</span>
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                                    {/* Pris */}
                                                    <div className="text-right font-bold text-slate-900 text-lg">
                                                        {Math.round(itemTotal)}:-
                                                    </div>

                                                    {/* Köpknapp */}
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