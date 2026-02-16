import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import CartSidebar from "@/components/CartSidebar";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileCart from "@/components/MobileCart";
import { BASE_URL } from '@/lib/config';
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit" });

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "PrisKombo - Optimera din inköpslista",
  description: "Skapa din inköpslista och se vilken butikskombination som blir billigast.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body className={`${inter.variable} ${outfit.variable} font-sans bg-gray-50 text-gray-900`}>
        <CartProvider>
          <div className="flex min-h-screen flex-col">
            
            <Navbar />

            <div className="flex flex-1 relative pt-28 lg:pt-20"> 
              
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

            {/* Toaster i sonner */}
            {/* richColors gör den grön/röd, closeButton lägger till ett kryss */}
            <Toaster richColors position="top-center" closeButton />

          </div>
        </CartProvider>
      </body>
    </html>
  );
}