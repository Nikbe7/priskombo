"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import API_URL from "@/lib/config";
import { useCart } from "@/context/CartContext";

export default function CategoryPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToBasket } = useCart();
  
  // Default sortering: popularity
  const currentPage = Number(searchParams.get("page")) || 1;
  const currentSort = searchParams.get("sort") || "popularity";
  const currentSearch = searchParams.get("search") || "";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(currentSearch);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm !== currentSearch) {
        updateParams(1, currentSort, searchTerm);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    if (params.id) {
      setLoading(true);
      let url = `${API_URL}/categories/${params.id}?page=${currentPage}&limit=20&sort=${currentSort}`;
      if (currentSearch) url += `&search=${currentSearch}`;

      fetch(url)
        .then(res => res.json())
        .then(data => setData(data))
        .catch(err => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [params.id, currentPage, currentSort, currentSearch]);

  const updateParams = (page: number, sort: string, search: string) => {
    const query = new URLSearchParams();
    query.set("page", page.toString());
    // Visa sort i URL även om det är popularity för tydlighet
    if (sort !== "popularity") query.set("sort", sort); 
    if (search) query.set("search", search);
    
    router.push(`/category/${params.id}?${query.toString()}`);
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParams(1, e.target.value, currentSearch);
  };

  const handlePageChange = (newPage: number) => {
    updateParams(newPage, currentSort, currentSearch);
  };

  if (loading && !data) return <div className="p-20 text-center text-gray-500 font-medium">Laddar produkter...</div>;
  if (!data || !data.category) return <div className="p-20 text-center">Kunde inte hitta kategorin.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans pb-32">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block font-medium">
            ← Tillbaka till startsidan
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-end border-b border-gray-200 pb-6 gap-4">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-900">{data.category.name}</h1>
              <p className="text-gray-500 mt-1">
                {data.pagination.total} produkter
                {currentSearch && ` matchar "${currentSearch}"`}
              </p>
            </div>

            <div className="flex gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <input 
                  type="text" 
                  placeholder={`Sök i ${data.category.name}...`}
                  className="w-full p-3 pl-4 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select 
                value={currentSort}
                onChange={handleSortChange}
                className="p-3 rounded-lg border border-gray-300 bg-white text-sm font-medium focus:border-blue-500 outline-none cursor-pointer"
              >
                <option value="popularity">Populärast</option>
                <option value="price_asc">Lägsta pris</option>
                <option value="price_desc">Högsta pris</option>
                <option value="discount_desc">Bästa deals 🔥</option>
                <option value="rating_desc">Bästa omdömen ⭐</option>
                <option value="name_asc">Namn (A-Ö)</option>
                <option value="newest">Nyast inkommet</option>
              </select>
            </div>
          </div>
        </div>

        {data.products.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            {/* Specialhantering om inga deals hittas */}
            {currentSort === 'discount_desc' ? (
              <div className="space-y-2">
                <p className="text-2xl mb-2">🤷‍♂️</p>
                <p className="text-gray-600 font-medium text-lg">Inga superdeals i denna kategori just nu.</p>
                <p className="text-sm text-gray-400">Vi visar bara produkter som har nedsatt pris här.</p>
                <button 
                  onClick={() => updateParams(1, 'popularity', currentSearch)} 
                  className="text-blue-600 hover:underline mt-4 text-sm font-bold bg-blue-50 px-4 py-2 rounded-full"
                >
                  Visa alla produkter istället
                </button>
              </div>
            ) : (
              <>
                <p className="text-gray-500">Inga produkter hittades.</p>
                {currentSearch && <button onClick={() => setSearchTerm("")} className="text-blue-600 hover:underline mt-2 text-sm">Rensa sökning</button>}
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4 mb-10">
            {data.products.map((p: any) => (
              <div key={p.id} className={`bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex gap-5 items-center hover:shadow-md transition ${loading ? 'opacity-50' : ''}`}>
                <Link href={`/product/${p.id}`} className="block flex-shrink-0 cursor-pointer">
                  <div className="w-20 h-20 bg-gray-50 rounded-lg flex items-center justify-center p-2 border border-gray-100 hover:opacity-90">
                    {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-contain" /> : <span className="text-2xl opacity-20">📷</span>}
                  </div>
                </Link>
                <div className="flex-1">
                   <Link href={`/product/${p.id}`} className="hover:underline decoration-blue-500">
                      <h3 className="font-bold text-gray-800 text-lg">{p.name}</h3>
                   </Link>
                   <div className="flex gap-2 text-sm mt-1 items-center">
                      <span className="text-gray-400 font-mono text-xs">EAN: {p.ean}</span>
                      {/* Visa betyg om det finns */}
                      {p.rating > 0 && (
                        <span className="text-yellow-500 text-xs font-bold flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded">
                          ⭐ {p.rating}
                        </span>
                      )}
                   </div>
                   <div className="mt-2 flex items-baseline gap-2">
                      <p className="text-blue-600 font-bold">
                          Från {p.prices.length > 0 ? Math.min(...p.prices.map((x:any) => x.price)) : "?"} kr
                      </p>
                      {/* Visa ordinarie pris om vi sorterar på deals för att bekräfta att det funkar */}
                      {currentSort === 'discount_desc' && p.prices[0]?.regular_price > 0 && (
                         <span className="text-xs text-gray-400 line-through">{p.prices[0].regular_price} kr</span>
                      )}
                   </div>
                </div>
                <button onClick={() => addToBasket(p)} className="bg-blue-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-full font-bold hover:bg-blue-100 transition whitespace-nowrap text-sm">+ Lägg till</button>
              </div>
            ))}
          </div>
        )}

        {data.pagination.total_pages > 1 && (
          <div className="flex justify-center gap-4 py-8">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} className="px-6 py-2 bg-white border border-gray-300 rounded-full font-bold text-gray-700 disabled:opacity-30 hover:bg-gray-50 transition">← Föregående</button>
            <span className="flex items-center font-bold text-gray-500">{currentPage} / {data.pagination.total_pages}</span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= data.pagination.total_pages} className="px-6 py-2 bg-white border border-gray-300 rounded-full font-bold text-gray-700 disabled:opacity-30 hover:bg-gray-50 transition">Nästa →</button>
          </div>
        )}
      </div>
    </div>
  );
}