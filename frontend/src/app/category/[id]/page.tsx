"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation"; // För att läsa ID från URL
import Link from "next/link";
import API_URL from "@/lib/config";

export default function CategoryPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetch(`${API_URL}/categories/${params.id}`)
        .then(res => res.json())
        .then(data => setData(data))
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) return <div className="p-10 text-center">Laddar kategori...</div>;
  if (!data) return <div className="p-10 text-center">Kunde inte hitta kategorin.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <Link href="/" className="text-blue-500 hover:underline mb-4 inline-block">← Tillbaka till sök</Link>
        
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">{data.category.name}</h1>
          <p className="text-gray-500">Hittade {data.products.length} produkter</p>
        </header>

        <div className="grid gap-4">
          {data.products.map((p: any) => (
            <div key={p.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-center">
              <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center p-2">
                {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-contain" /> : "📷"}
              </div>
              <div className="flex-1">
                 <h3 className="font-bold">{p.name}</h3>
                 <p className="text-blue-600 font-medium">Från {Math.min(...p.prices.map((x:any) => x.price))} kr</p>
              </div>
              {/* Obs: För att "Lägg i korg" ska funka här måste vi ha Global State (Context), 
                  men det tar vi i nästa steg. Just nu visar vi bara produkterna. */}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}