"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

type Product = { 
  id: number; 
  name: string; 
  ean: string;
  image_url: string | null; 
  prices: { price: number; store: string; url: string }[] 
};

interface CartContextType {
  basket: Product[];
  addToBasket: (product: Product) => void;
  removeFromBasket: (productId: number) => void;
  isCartOpen: boolean; // <-- Nytt state
  toggleCart: () => void; // <-- Ny funktion
  setIsCartOpen: (isOpen: boolean) => void; // <-- Ny funktion
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [basket, setBasket] = useState<Product[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false); // Stängd som standard

  const addToBasket = (product: Product) => {
    if (!basket.find((p) => p.id === product.id)) {
      setBasket((prev) => [...prev, product]);
      setIsCartOpen(true); // Öppna listan automatiskt när man lägger till!
    }
  };

  const removeFromBasket = (productId: number) => {
    setBasket((prev) => prev.filter((p) => p.id !== productId));
  };

  const toggleCart = () => setIsCartOpen((prev) => !prev);

  return (
    <CartContext.Provider value={{ 
      basket, 
      addToBasket, 
      removeFromBasket,
      isCartOpen,
      toggleCart,
      setIsCartOpen
    }}>
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