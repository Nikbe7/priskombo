export default function ProductCardSkeleton() {
  return (
    <div data-testid="product-skeleton" className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
      {/* Bild-placeholder */}
      <div className="h-48 bg-gray-100 rounded-lg mb-4 w-full animate-pulse" />
      
      {/* Titel-rader */}
      <div className="h-4 bg-gray-100 rounded w-3/4 mb-2 animate-pulse" />
      <div className="h-4 bg-gray-100 rounded w-1/2 mb-auto animate-pulse" />

      {/* Footer (Pris och knapp) */}
      <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
        <div className="flex flex-col gap-1">
           <div className="h-6 w-24 bg-gray-100 rounded animate-pulse" /> {/* Pris */}
           <div className="h-3 w-16 bg-gray-100 rounded animate-pulse" /> {/* Antal butiker */}
        </div>
        <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" /> {/* Knapp */}
      </div>
    </div>
  );
}
