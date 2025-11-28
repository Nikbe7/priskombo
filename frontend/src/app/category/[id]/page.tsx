"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import API_URL from "@/lib/config";
import { useCart } from "@/context/CartContext"; // <-- Importera Global Cart

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToBasket } = useCart(); // <-- Hook
  
  const currentPage = Number(searchParams.get("page")) || 1;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      setLoading(true);
      fetch(`${API_URL}/categories/${params.id}?page=${currentPage}&limit=20`)
        .then(res => res.json())
        .then(data => setData(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [params.id, currentPage]);

  const changePage = (newPage: number) => {
    router.push(`/category/${params.id}?page=${newPage}`);
  };

  if (loading) return <div className="p-20 text-center text-gray-500 font-medium">Laddar produkter...</div>;
  if (!data || !data.category) return <div className="p-20 text-center">Kunde inte hitta kategorin.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans pb-32">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-blue-600 hover:underline mb-6 inline-block font-medium">
          ← Tillbaka till sök
        </Link>
        
        <header className="mb-8 flex justify-between items-end border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900">{data.category.name}</h1>
            <p className="text-gray-500 mt-1">Visar {data.products.length} av {data.pagination.total} produkter</p>
          </div>
          <div className="text-sm text-gray-400 font-medium">
            Sida {data.pagination.page} av {data.pagination.total_pages}
          </div>
        </header>

        {/* PRODUKTLISTA */}
        <div className="grid gap-4 mb-10">
          {data.products.map((p: any) => (
            <div key={p.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex gap-5 items-center hover:shadow-md transition">
              
              <Link href={`/product/${p.id}`} className="block flex-shrink-0 cursor-pointer">
                <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center p-2 border border-gray-100 hover:opacity-90">
                  {p.image_url ? (
                    <img src={p.image_url} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-2xl opacity-20">📷</span>
                  )}
                </div>
              </Link>

              <div className="flex-1">
                 <Link href={`/product/${p.id}`} className="hover:underline decoration-blue-500">
                    <h3 className="font-bold text-gray-800 text-lg">{p.name}</h3>
                 </Link>
                 <div className="flex gap-2 text-sm mt-1">
                    <span className="text-gray-400 font-mono text-xs">EAN: {p.ean}</span>
                 </div>
                 <p className="text-blue-600 font-bold mt-2">
                    Från {p.prices.length > 0 ? Math.min(...p.prices.map((x:any) => x.price)) : "?"} kr
                 </p>
              </div>

              {/* LÄGG I GLOBAL KORG (Lade till denna så man kan handla direkt från listan) */}
              <button 
                onClick={() => addToBasket(p)}
                className="bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-full font-bold hover:bg-blue-100 transition whitespace-nowrap text-sm"
              >
                + Lägg i
              </button>
            </div>
          ))}
        </div>

        {/* PAGINERING */}
        {data.pagination.total_pages > 1 && (
          <div className="flex justify-center gap-4 py-8">
            <button 
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-6 py-2 bg-white border border-gray-300 rounded-full font-bold text-gray-700 disabled:opacity-30 hover:bg-gray-50 transition"
            >
              ← Föregående
            </button>
            
            <span className="flex items-center font-bold text-gray-500">
                {currentPage} / {data.pagination.total_pages}
            </span>

            <button 
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage >= data.pagination.total_pages}
              className="px-6 py-2 bg-white border border-gray-300 rounded-full font-bold text-gray-700 disabled:opacity-30 hover:bg-gray-50 transition"
            >
              Nästa →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}