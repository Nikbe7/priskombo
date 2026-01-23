"use client";
import { useCart } from "@/context/CartContext";
import Link from "next/link";
import { useEffect } from "react";
import { X, Trash2, ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";

export default function CartSidebar() {
  const {
    basket,
    removeFromBasket,
    updateQuantity,
    isCartOpen,
    setIsCartOpen,
    cartTotal,
  } = useCart();

  const pathname = usePathname();
  const isOptimizePage = pathname === "/optimize";

  // Stäng sidebar om man trycker Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsCartOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [setIsCartOpen]);

  // "PUSH" EFFEKT - Endast desktop
  useEffect(() => {
    const adjustBodyPadding = () => {
      if (window.innerWidth >= 640) {
        if (isCartOpen) {
          document.body.style.paddingRight = "450px";
          document.body.style.transition = "padding-right 0.3s ease-in-out";
        } else {
          document.body.style.paddingRight = "0px";
        }
      } else {
        document.body.style.paddingRight = "0px";
        // Förhindra scroll på body när menyn är öppen på mobil
        document.body.style.overflow = isCartOpen ? "hidden" : "auto";
      }
    };

    adjustBodyPadding();
    window.addEventListener("resize", adjustBodyPadding);
    
    return () => {
      window.removeEventListener("resize", adjustBodyPadding);
      document.body.style.paddingRight = "0px";
      document.body.style.overflow = "auto";
    };
  }, [isCartOpen]);

  return (
    <>
      {/* Mörk bakgrund (backdrop) endast på mobil */}
      <div 
        className={`fixed inset-0 bg-black/50 z-[90] sm:hidden transition-opacity duration-300 ${
            isCartOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsCartOpen(false)}
      />

      <aside
        className={`fixed top-0 right-0 h-full w-[85%] sm:w-[450px] bg-white z-[100] shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col border-l border-gray-100 ${
          isCartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b flex justify-between items-center bg-gray-50 mt-safe-top"> {/* mt-safe-top för iOS notch */}
          <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" /> Din Inköpslista
            <span className="bg-black text-white text-xs px-2 py-0.5 rounded-full">
              {basket.length}
            </span>
          </h2>
          
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 hover:bg-gray-200 rounded-full transition"
            title="Stäng"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Innehåll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {basket.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
              <ShoppingBag className="w-16 h-16 opacity-20" />
              <p>Listan är tom</p>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="text-sm text-black underline hover:no-underline"
              >
                Börja handla
              </button>
            </div>
          ) : (
            basket.map((item) => {
               const hasPrices = item.prices && item.prices.length > 0;
               const minPrice = hasPrices ? Math.min(...item.prices.map((x) => x.price)) : 0;
               
               return (
                <div key={item.id} className="flex gap-3 sm:gap-4 items-start border-b pb-4 last:border-0 animate-in slide-in-from-right-4">
                  {/* Bild */}
                  {item.slug ? (
                    <Link href={`/${item.slug}`} onClick={() => setIsCartOpen(false)}>
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-lg border flex-shrink-0 relative overflow-hidden">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="object-contain w-full h-full p-2 mix-blend-multiply"
                          />
                        ) : (
                          <span className="text-2xl absolute inset-0 flex items-center justify-center">📦</span>
                        )}
                      </div>
                    </Link>
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 rounded-lg border flex-shrink-0 relative overflow-hidden">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="object-contain w-full h-full p-2 mix-blend-multiply"
                        />
                      ) : (
                        <span className="text-2xl absolute inset-0 flex items-center justify-center">📦</span>
                      )}
                    </div>
                  )}
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-medium text-sm truncate pr-2 text-gray-900 line-clamp-2 whitespace-normal" title={item.name}>
                        {item.slug ? (
                          <Link 
                            href={`/${item.slug}`} 
                            className="hover:text-blue-600 hover:underline transition-colors"
                            onClick={() => setIsCartOpen(false)}
                          >
                            {item.name}
                          </Link>
                        ) : (
                          item.name
                        )}
                      </h3>
                      <button 
                        onClick={() => removeFromBasket(item.id)}
                        className="text-gray-400 hover:text-red-600 transition p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex justify-between items-end mt-3">
                      <div className="flex items-center border rounded-md bg-white shadow-sm">
                        <button 
                          onClick={() => {
                            if (item.quantity === 1) {
                              removeFromBasket(item.id);
                            } else {
                              updateQuantity(item.id, -1);
                            }
                          }}
                          className="px-2 py-1 hover:bg-gray-100 text-gray-600 disabled:opacity-50"
                        >-</button>
                        <span className="px-2 text-sm font-semibold min-w-[1.5rem] text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.id, 1)}
                          className="px-2 py-1 hover:bg-gray-100 text-gray-600"
                        >+</button>
                      </div>
                      
                      <div className="text-right">
                          <div className="font-bold text-gray-900">{Math.round(minPrice * item.quantity)} kr</div>
                          <div className="text-[10px] text-gray-500">ca {Math.round(minPrice)} kr/st</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {basket.length > 0 && (
          <div className="p-4 sm:p-5 border-t bg-gray-50 space-y-4 mb-safe-bottom">
            <div className="flex justify-between items-center text-lg font-medium text-gray-900">
               <span>Totalt (varor):</span>
               <span>{cartTotal} kr</span>
            </div>
            
            {!isOptimizePage && (
                <Link 
                    href="/optimize"
                    onClick={() => setIsCartOpen(false)}
                    className="block w-full py-3.5 sm:py-4 bg-black text-white text-center font-bold rounded-lg hover:bg-gray-800 transition shadow-lg hover:shadow-xl transform active:scale-[0.98]"
                >
                    Hitta bästa kombon ➔
                </Link>
            )}

            {isOptimizePage && (
                <div className="text-center text-xs text-gray-400">
                    Justera antal här för att se priset uppdateras
                </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
}