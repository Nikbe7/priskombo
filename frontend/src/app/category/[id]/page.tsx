"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import API_URL from "@/lib/config";

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Läs sidnummer från URL (t.ex. ?page=2), default till 1
  const currentPage = Number(searchParams.get("page")) || 1;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      setLoading(true);
      // Anropa API med rätt sidnummer
      fetch(`${API_URL}/categories/${params.id}?page=${currentPage}&limit=20`)
        .then(res => res.json())
        .then(data => setData(data))
        .finally(() => setLoading(false));
    }
  }, [params.id, currentPage]); // Körs om ID eller Sida ändras

  // Funktion för att byta sida
  const changePage = (newPage: number) => {
    router.push(`/category/${params.id}?page=${newPage}`);
  };

  if (loading) return <div className="p-20 text-center text-gray-500">Laddar produkter...</div>;
  if (!data || !data.category) return <div className="p-20 text-center">Kunde inte hitta kategorin.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-blue-500 hover:underline mb-6 inline-block font-medium">← Tillbaka till sök</Link>
        
        <header className="mb-8 flex justify-between items-end border-b pb-4">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900">{data.category.name}</h1>
            <p className="text-gray-500 mt-1">Visar {data.products.length} av {data.pagination.total} produkter</p>
          </div>
          <div className="text-sm text-gray-400">
            Sida {data.pagination.page} av {data.pagination.total_pages}
          </div>
        </header>

        {/* PRODUKTLISTA */}
        <div className="grid gap-4 mb-10">
          {data.products.map((p: any) => (
            <div key={p.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex gap-5 items-center hover:shadow-md transition">
              <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center p-2 border border-gray-100">
                {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-contain" /> : <span className="text-2xl opacity-20">📷</span>}
              </div>
              <div className="flex-1">
                 <h3 className="font-bold text-gray-800 text-lg">{p.name}</h3>
                 <div className="flex gap-2 text-sm mt-1">
                    <span className="text-gray-500">EAN: {p.ean}</span>
                 </div>
                 <p className="text-blue-600 font-bold mt-2">
                    Från {p.prices.length > 0 ? Math.min(...p.prices.map((x:any) => x.price)) : "?"} kr
                 </p>
              </div>
            </div>
          ))}
        </div>

        {/* PAGINERING KNAPPAR */}
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