import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext"; // <-- Importera Provider
import CartSidebar from "@/components/CartSidebar";   // <-- Importera Sidebar

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PrisKombo - Hitta billigaste varukorgen",
  description: "Jämför och kombinera priser från alla butiker.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body className={`${inter.className} flex bg-gray-50`}>
        {/* Vi omsluter allt med CartProvider */}
        <CartProvider>
          {/* Huvudinnehållet (Sidorna) */}
          <div className="flex-1">
            {children}
          </div>
          
          {/* Varukorgen (ligger alltid till höger nu) */}
          <CartSidebar />
        </CartProvider>
      </body>
    </html>
  );
}