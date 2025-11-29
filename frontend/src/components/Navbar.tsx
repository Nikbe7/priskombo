"use client";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { basket } = useCart();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:text-blue-600 hover:bg-gray-50";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xl w-10 h-10 flex items-center justify-center rounded-xl shadow-lg shadow-blue-200 group-hover:scale-105 transition duration-300">
            P
          </div>
          <span className="font-extrabold text-2xl text-gray-900 tracking-tight">
            Pris<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Kombo</span>
          </span>
        </Link>

        {/* MENY (Desktop) */}
        <div className="hidden md:flex gap-2">
          <Link href="/" className={`px-4 py-2 rounded-full text-sm font-bold transition ${isActive('/')}`}>
            Sök
          </Link>
          <Link href="/deals" className={`px-4 py-2 rounded-full text-sm font-bold transition ${isActive('/deals')} ${pathname === '/deals' ? 'text-red-600 bg-red-50' : 'text-gray-600 hover:text-red-500'}`}>
            Deals 🔥
          </Link>
        </div>

        {/* VARUKORGS-IKON */}
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer">
            <span className="text-2xl">🛒</span>
            {basket.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm animate-bounce">
                {basket.length}
              </span>
            )}
          </div>
        </div>

      </div>
    </nav>
  );
}