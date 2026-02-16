"use client";
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useEffect,
} from "react";
import type { Product, CartItem } from "@/types/product";

interface CartContextType {
  basket: CartItem[];
  addToBasket: (product: Product) => void;
  removeFromBasket: (productId: number) => void;
  updateQuantity: (productId: number, change: number) => void;
  totalItems: number;
  cartTotal: number;
  isCartOpen: boolean;
  toggleCart: () => void;
  setIsCartOpen: (isOpen: boolean) => void;
  isInitialized: boolean; // <--- NYTT: Exportera denna
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [basket, setBasket] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. LADDA FRÅN LOCALSTORAGE
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedCart = localStorage.getItem("priskombo_cart");
      if (savedCart) {
        try {
          setBasket(JSON.parse(savedCart));
        } catch (err) {
          console.error("Kunde inte ladda varukorgen:", err);
        }
      }
      setIsInitialized(true); // Nu är vi klara
    }
  }, []);

  // 2. SPARA TILL LOCALSTORAGE
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("priskombo_cart", JSON.stringify(basket));
    }
  }, [basket, isInitialized]);

  const addToBasket = (product: Product) => {
    setBasket((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      } else {
        setIsCartOpen(true);
        return [...prev, { ...product, quantity: 1 }];
      }
    });
  };

  const updateQuantity = (productId: number, change: number) => {
    setBasket((prev) =>
      prev.map((item) => {
        if (item.id === productId) {
          const newQuantity = item.quantity + change;
          return { ...item, quantity: Math.max(1, newQuantity) };
        }
        return item;
      })
    );
  };

  const removeFromBasket = (productId: number) => {
    setBasket((prev) => prev.filter((p) => p.id !== productId));
  };

  const toggleCart = () => setIsCartOpen((prev) => !prev);

  const totalItems = useMemo(
    () => basket.reduce((sum, item) => sum + item.quantity, 0),
    [basket]
  );

  const cartTotal = useMemo(
    () =>
      basket.reduce((sum, item) => {
        const prices = item.prices.map((p) => p.price);
        const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
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
        cartTotal,
        isCartOpen,
        toggleCart,
        setIsCartOpen,
        isInitialized,
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