"use client";
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
} from "react";

// Vi definierar Product som vanligt
export type Product = {
  id: number;
  name: string;
  ean: string;
  slug: string | null;
  image_url: string | null;
  category: { name: string; slug: string } | null;
  prices: { price: number; store: string; url: string }[];
};

// Vi skapar en ny typ för varor i korgen som inkluderar antal
export type CartItem = Product & { quantity: number };

interface CartContextType {
  basket: CartItem[];
  addToBasket: (product: Product) => void;
  removeFromBasket: (productId: number) => void;
  updateQuantity: (productId: number, change: number) => void; // <--- NYTT
  totalItems: number; // <--- NYTT: Totalt antal varor (t.ex. 5 st)
  totalPriceEstimate: number; // <--- NYTT: Ungefärligt pris
  isCartOpen: boolean;
  toggleCart: () => void;
  setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [basket, setBasket] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // 1. LÄGG TILL (Eller öka antal)
  const addToBasket = (product: Product) => {
    setBasket((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        // Om den finns, öka antal med 1
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      } else {
        // Annars lägg till ny med quantity: 1
        setIsCartOpen(true); // Öppna bara om det är en NY produkt
        return [...prev, { ...product, quantity: 1 }];
      }
    });
  };

  // 2. ÄNDRA ANTAL (+/-)
  const updateQuantity = (productId: number, change: number) => {
    setBasket((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            return { ...item, quantity: item.quantity + change };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromBasket = (productId: number) => {
    setBasket((prev) => prev.filter((p) => p.id !== productId));
  };

  const toggleCart = () => setIsCartOpen((prev) => !prev);

  // Beräkna totalt antal produkter
  const totalItems = useMemo(
    () => basket.reduce((sum, item) => sum + item.quantity, 0),
    [basket]
  );

  // Beräkna ett "bästa pris" estimat för UI
  const totalPriceEstimate = useMemo(
    () =>
      basket.reduce((sum, item) => {
        const lowestPrice = Math.min(...item.prices.map((p) => p.price));
        return sum + lowestPrice * item.quantity;
      }, 0),
    [basket]
  );

  return (
    <CartContext.Provider
      value={{
        basket,
        addToBasket,
        removeFromBasket,
        updateQuantity,
        totalItems,
        totalPriceEstimate,
        isCartOpen,
        toggleCart,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart måste användas inom en CartProvider");
  }
  return context;
}
