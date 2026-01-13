"use client";

import { useCart } from "@/context/CartContext";
import API_URL from "@/lib/config";
import { ExternalLink, Truck, CheckCircle, ArrowLeft, Plus, Minus, Trash2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function OptimizePage() {
  const { basket, updateQuantity, removeFromBasket, cartTotal, isInitialized } = useCart();
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Redirect ENDAST om vi laddat klart (isInitialized) och korgen är tom
  useEffect(() => {
    if (isInitialized && basket.length === 0) {
      router.push("/");
    }
  }, [basket, isInitialized, router]);

  // Hämta optimering (körs bara om vi har items)
  useEffect(() => {
    if (!isInitialized || basket.length === 0) return;

    const fetchOptimization = async () => {
      // ... (samma kod som innan)
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
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(() => {
        fetchOptimization();
    }, 500);

    return () => clearTimeout(timeoutId);

  }, [basket, isInitialized]);

  // Visa inget (eller en spinner) medan vi laddar från localStorage
  if (!isInitialized) return null;

  // Om korgen är tom (men vi har laddat klart), returnera null så redirecten hinner kicka in
  if (basket.length === 0) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Top Navigation */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-black transition"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Fortsätt handla
          </Link>
          <h1 className="text-2xl font-bold hidden md:block">
            Optimering av varukorg
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* VÄNSTER KOLUMN: Redigera Varukorg */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold mb-4 flex justify-between items-center">
                Din lista
                <span className="text-sm font-normal text-gray-500">
                  {basket.length} varor
                </span>
              </h2>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {basket.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 items-start border-b border-gray-50 pb-4 last:border-0 last:pb-0"
                  >
                    {/* Bild */}
                    <div className="w-16 h-16 bg-gray-50 rounded border flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          className="object-contain w-full h-full p-1 mix-blend-multiply"
                        />
                      ) : (
                        "📦"
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        {/* FIX 1: LÄNK TILL PRODUKT */}
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                          {item.slug ? (
                            <Link
                              href={`/${item.slug}`}
                              target="_blank" // Öppnar i ny flik så man inte tappar sin optimering
                              className="hover:text-blue-600 hover:underline transition-colors"
                            >
                              {item.name}
                            </Link>
                          ) : (
                            item.name
                          )}
                        </h3>

                        <button
                          onClick={() => removeFromBasket(item.id)}
                          className="text-gray-300 hover:text-red-500 transition ml-2 flex-shrink-0"
                          title="Ta bort"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center bg-gray-100 rounded-lg p-1">
                          {/* FIX 2: TA BORT OM ANTAL ÄR 1 */}
                          <button
                            onClick={() => {
                              if (item.quantity === 1) {
                                removeFromBasket(item.id);
                              } else {
                                updateQuantity(item.id, -1);
                              }
                            }}
                            className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <span className="w-8 text-center text-sm font-bold select-none">
                            {item.quantity}
                          </span>

                          <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-7 h-7 flex items-center justify-center bg-white rounded shadow-sm hover:text-blue-600 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <div className="text-sm font-semibold text-gray-900 whitespace-nowrap ml-2">
                          {Math.round(
                            Math.min(...item.prices.map((p) => p.price)) *
                              item.quantity
                          )}{" "}
                          kr
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t flex justify-between items-center">
                <span className="text-gray-500">Varuvärde (ca)</span>
                <span className="text-xl font-bold">{cartTotal} kr</span>
              </div>
            </div>
          </div>

          {/* HÖGER KOLUMN: Resultat */}
          <div className="lg:col-span-7">
            {loading ? (
              <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center animate-pulse">
                <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                <h3 className="text-lg font-bold text-gray-800">
                  Räknar ut bästa pris...
                </h3>
                <p className="text-gray-500">
                  Jämför {basket.length} produkter hos olika butiker
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-bold">Bästa köp</h2>
                  <span className="text-sm text-gray-500">
                    {results?.length || 0} alternativ hittades
                  </span>
                </div>

                {results?.map((option, idx) => (
                  <div
                    key={idx}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition duration-300"
                  >
                    {/* Resultat Header */}
                    <div
                      className={`p-5 border-b ${
                        option.type === "Samlad leverans"
                          ? "bg-gradient-to-r from-green-50 to-white border-green-100"
                          : "bg-gradient-to-r from-blue-50 to-white border-blue-100"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span
                              className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                option.type === "Samlad leverans"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {option.type}
                            </span>
                            {idx === 0 && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-green-700 bg-white px-2 py-1 rounded border border-green-200 shadow-sm">
                                <CheckCircle className="w-3 h-3" /> SPARA MEST
                              </span>
                            )}
                          </div>
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-extrabold text-gray-900">
                              {Math.round(option.total_cost)} kr
                            </h3>
                            <span className="text-sm text-gray-500">
                              inkl. frakt
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* NY DESIGN PÅ LISTAN: Tydlig gruppering */}
                    <div className="bg-gray-50/50 divide-y divide-gray-100">
                      {option.details.map((detail: any, i: number) => (
                        <div
                          key={i}
                          className="p-6 md:flex md:gap-6 hover:bg-white transition duration-200"
                        >
                          {/* 1. BUTIK */}
                          <div className="md:w-1/4 mb-4 md:mb-0">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 bg-white rounded-full border flex items-center justify-center shadow-sm text-lg font-bold text-gray-700 uppercase">
                                {detail.store.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-bold text-lg text-gray-900 leading-tight">
                                  {detail.store}
                                </h4>
                                <p className="text-xs text-gray-500">
                                  Leverans {i + 1}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 space-y-2">
                              <div className="text-sm font-medium text-gray-900">
                                {Math.round(detail.products_cost)} kr{" "}
                                <span className="text-gray-400 font-normal">
                                  varor
                                </span>
                              </div>
                              <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                                {detail.shipping === 0 ? (
                                  <span className="text-green-600">
                                    Fri frakt
                                  </span>
                                ) : (
                                  <span>
                                    {detail.shipping} kr{" "}
                                    <span className="text-gray-400 font-normal">
                                      frakt
                                    </span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* 2. PRODUKTER (Vit Box) */}
                          <div className="flex-1 bg-white rounded-lg border border-gray-100 p-4 shadow-sm">
                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                              Innehåll ({detail.products.length} st)
                            </h5>
                            <ul className="space-y-3">
                              {detail.products.map(
                                (prod: any, pIdx: number) => (
                                  <li
                                    key={pIdx}
                                    className="flex items-start gap-3 text-sm"
                                  >
                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />

                                    {/* HÄR ÄR FIXEN: / före slug */}
                                    {prod.slug ? (
                                      <Link
                                        href={`/${prod.slug}`}
                                        target="_blank"
                                        className="text-gray-700 hover:text-blue-600 hover:underline leading-snug"
                                      >
                                        {prod.name}
                                      </Link>
                                    ) : (
                                      <span className="text-gray-700 leading-snug">
                                        {prod.name}
                                      </span>
                                    )}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>

                          {/* 3. KNAPP */}
                          <div className="md:w-1/5 flex flex-col justify-center mt-4 md:mt-0">
                            <a
                              href={`https://www.${detail.store.toLowerCase()}.se`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 w-full py-3 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition shadow-lg hover:shadow-gray-300"
                            >
                              Gå till butik <ExternalLink className="w-4 h-4" />
                            </a>
                            <p className="text-[10px] text-center text-gray-400 mt-2">
                              Öppnas i ny flik
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
