import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto py-12">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-gray-500">
        
        {/* Kolumn 1 */}
        <div>
          <h3 className="font-bold text-gray-900 text-lg mb-4">PrisKombo</h3>
          <p className="mb-4">
            Vi hjälper dig hitta den billigaste kombinationen av produkter för hela din inköpslista.
          </p>
          <p>&copy; {new Date().getFullYear()} PrisKombo Sverige.</p>
        </div>

        {/* Kolumn 2 */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4">Upptäck</h3>
          <ul className="space-y-2">
            <li><Link href="/" className="hover:text-blue-600">Sök produkter</Link></li>
            <li><Link href="/category/1" className="hover:text-blue-600">Hårvård</Link></li>
            <li><Link href="/category/2" className="hover:text-blue-600">Ansiktsvård</Link></li>
          </ul>
        </div>

        {/* Kolumn 3 */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4">Om oss</h3>
          <ul className="space-y-2">
            <li><a href="#" className="hover:text-blue-600">Kontakt</a></li>
            <li><a href="#" className="hover:text-blue-600">Integritetspolicy</a></li>
            <li><a href="#" className="hover:text-blue-600">Användarvillkor</a></li>
          </ul>
        </div>

      </div>
    </footer>
  );
}
