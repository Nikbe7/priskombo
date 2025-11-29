"use client";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function Navbar() {
  const { basket } = useCart();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-blue-600 text-white font-bold text-xl w-8 h-8 flex items-center justify-center rounded-lg group-hover:bg-blue-700 transition">
            P
          </div>
          <span className="font-bold text-xl text-gray-900 tracking-tight">
            Pris<span className="text-blue-600">Kombo</span>
          </span>
        </Link>

        {/* MENY (Desktop) */}
        <div className="hidden md:flex gap-6 text-sm font-medium text-gray-600">
          <Link href="/" className="hover:text-blue-600 transition">Sök</Link>
          <Link href="/categories" className="hover:text-blue-600 transition">Kategorier</Link>
          <Link href="/deals" className="hover:text-blue-600 transition text-red-500">Deals 🔥</Link>
        </div>

        {/* VARUKORGS-IKON (Mobil-anpassning för framtiden) */}
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            <span className="font-bold text-blue-600">{basket.length}</span> varor
          </div>
        </div>

      </div>
    </nav>
  );
}