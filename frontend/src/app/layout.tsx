import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import CartSidebar from "@/components/CartSidebar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCart from "@/components/MobileCart";

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
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <CartProvider>
          <div className="flex min-h-screen flex-col">
            
            <Navbar />

            <div className="flex flex-1 relative"> 
              
              <div className="flex-1 flex flex-col min-w-0">
                <main className="flex-1 w-full">
                  {children}
                </main>
                <Footer />
              </div>

              {/* Sidebar hanterar nu sin egen synlighet */}
              <CartSidebar />

            </div>
            
            {/* Mobil Varukorg */}
            <MobileCart /> 

          </div>
        </CartProvider>
      </body>
    </html>
  );
}