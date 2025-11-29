import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import CartSidebar from "@/components/CartSidebar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
            
            {/* 1. NAVBAR (Ligger alltid överst) */}
            <Navbar />

            <div className="flex flex-1 relative"> {/* Flex container för Sida + Sidebar */}
              
              {/* 2. HUVUDINNEHÅLL (Växer för att fylla plats) */}
              <div className="flex-1 flex flex-col min-w-0">
                <main className="flex-1 w-full">
                  {children}
                </main>
                
                {/* 3. FOOTER (Ligger längst ner i huvudinnehållet) */}
                <Footer />
              </div>

              {/* 4. SIDEBAR (Ligger till höger, fast klistrad) */}
              {/* hidden on mobile (md:block) för att inte ta upp hela skärmen i mobilen än */}
              <div className="hidden lg:block relative w-96"> 
                <CartSidebar />
              </div>

            </div>
          </div>
        </CartProvider>
      </body>
    </html>
  );
}