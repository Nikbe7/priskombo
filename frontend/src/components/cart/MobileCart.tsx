"use client";
import { useCart } from "@/context/CartContext";

export default function MobileCart() {
  const {
    basket,
    isCartOpen,
    setIsCartOpen,
    totalItems,
  } = useCart();

  // Visa inte knappen om korgen är tom eller om sidebaren redan är öppen
  if (basket.length === 0 || isCartOpen) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-30 lg:hidden animate-fade-in-up">
      <button
        onClick={() => setIsCartOpen(true)}
        className="w-full bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex justify-between items-center font-bold border border-slate-700/50"
      >
        <span className="flex items-center gap-2">
          <span className="text-xl">📝</span> Visa listan
        </span>
        <span className="bg-white text-slate-900 px-3 py-1 rounded-full text-xs font-extrabold">
          {totalItems} st
        </span>
      </button>
    </div>
  );
}
