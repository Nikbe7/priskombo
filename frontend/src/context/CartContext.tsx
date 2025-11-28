"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

// Definiera typerna (samma som du haft förut)
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [basket, setBasket] = useState<Product[]>([]);

  const addToBasket = (product: Product) => {
    // Förhindra dubbletter (eller ändra logik om du vill ha antal)
    if (!basket.find((p) => p.id === product.id)) {
      setBasket((prev) => [...prev, product]);
    }
  };

  const removeFromBasket = (productId: number) => {
    setBasket((prev) => prev.filter((p) => p.id !== productId));
  };

  return (
    <CartContext.Provider value={{ basket, addToBasket, removeFromBasket }}>
      {children}
    </CartContext.Provider>
  );
}

// En hook för att enkelt använda korgen i andra komponenter
export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart måste användas inom en CartProvider");
  }
  return context;
}