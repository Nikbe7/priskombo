import { MetadataRoute } from 'next';
import API_URL, { BASE_URL } from '@/lib/config';

type Category = {
  slug: string;
  updated_at?: string;
};

type Product = {
  slug: string;
  updated_at?: string;
  category?: { slug: string };
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 1. Hämta Kategorier
  let categories: Category[] = [];
  try {
    const res = await fetch(`${API_URL}/categories`, { next: { revalidate: 3600 } });
    if (res.ok) categories = await res.json();
  } catch (error) {
    console.error('Sitemap Error (Categories):', error);
  }

  // 2. Hämta Produkter
  // OBS: Vi sätter en hög limit för att få med så många som möjligt.
  // Om du har 100 000+ produkter behöver du en mer avancerad lösning senare.
  let products: Product[] = [];
  try {
    const res = await fetch(`${API_URL}/products?limit=2000`, { next: { revalidate: 3600 } });
    if (res.ok) {
        const json = await res.json();
        products = json.data; // Viktigt: Vi hämtar arrayen från "data" propertyn
    }
  } catch (error) {
    console.error('Sitemap Error (Products):', error);
  }

  // 3. Bygg URL:er för statiska sidor
  const routes = [
    '', // Hem
    '/deals',
  ].map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 1.0,
  }));

  // 4. Bygg URL:er för Kategorier
  const categoryRoutes = categories.map((cat) => ({
    url: `${BASE_URL}/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // 5. Bygg URL:er för Produkter
  // Här använder vi din "Hybrid URL" logik. 
  // Om produkten har en kategori, lägg till den i URLen för snyggare SEO.
  const productRoutes = products.map((prod) => {
    // Om backend skickar med category-objektet (som vi fixade i förra steget)
    // så kan vi bygga /kategori/produkt-slug. Annars bara /produkt-slug.
    const urlPath = prod.category?.slug 
        ? `/${prod.category.slug}/${prod.slug}`
        : `/${prod.slug}`;

    return {
        url: `${BASE_URL}${urlPath}`,
        lastModified: new Date(), // Eller prod.updated_at om det finns
        changeFrequency: 'daily' as const,
        priority: 0.6,
    };
  });

  return [...routes, ...categoryRoutes, ...productRoutes];
}