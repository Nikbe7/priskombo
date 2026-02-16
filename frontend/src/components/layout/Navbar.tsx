"use client";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { ShoppingBag, Flame } from "lucide-react";
import SearchBar from "./SearchBar";

export default function Navbar() {
  const { totalItems, toggleCart } = useCart();
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-slate-950 border-b border-slate-900 shadow-xl transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group flex-shrink-0">
          <div className="bg-gradient-to-tr from-blue-500 to-indigo-500 text-white font-bold text-xl sm:text-2xl w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl sm:rounded-2xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition duration-300">
            P
          </div>
          <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-white">
            Pris
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
              Kombo
            </span>
          </span>
        </Link>

        {/* SÖKFÄLT (Desktop) */}
        <Suspense fallback={<div className="flex-1 max-w-2xl mx-8 h-12 bg-slate-800 rounded-full animate-pulse hidden md:block" />}>
          <SearchBar />
        </Suspense>

        {/* HÖGER DEL */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <Link
            href="/deals"
            className={`hidden lg:flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all border ${
              pathname === "/deals"
                ? "bg-red-500/10 text-red-400 border-red-500/20"
                : "text-slate-300 border-transparent hover:border-red-500/30 hover:bg-red-500/10 hover:text-white"
            }`}
          >
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" /> Deals
          </Link>

          {/* LIST-IKON */}
          <button
            onClick={toggleCart}
            className="relative group cursor-pointer flex items-center gap-2 sm:gap-3 hover:bg-white/10 p-2 sm:p-2.5 rounded-xl transition-all border border-transparent hover:border-slate-700"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300 group-hover:text-white transition-colors" />
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] font-bold w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full shadow-lg ring-2 ring-slate-900 animate-bounce">
                  {totalItems}
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-slate-300 hidden sm:block group-hover:text-white">
              Min lista
            </span>
          </button>
        </div>
      </div>
      
      {/* MOBIL SÖK - Padding justerad */}
      <div className="md:hidden px-4 pb-3 pt-0 bg-slate-950">
         <Suspense>
            <SearchBar mobile />
         </Suspense>
      </div>
    </nav>
  );
}
