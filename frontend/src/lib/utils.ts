// frontend/src/lib/utils.ts

export function createProductUrl(id: number, slug: string | null, name: string, categorySlug?: string, parentCategorySlug?: string) {
  const productSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  
  // Om vi har kategori-info, bygg snygg URL
  if (categorySlug) {
      if (parentCategorySlug) {
          return `/${parentCategorySlug}/${categorySlug}/${productSlug}`;
      }
      return `/${categorySlug}/${productSlug}`;
  }
  
  // Fallback om vi inte vet kategorin just nu:
  // Next.js routern vi byggde ovan bryr sig egentligen bara om sista delen!
  // Så "/produkt/produkt-slug" funkar också tekniskt sett med vår router,
  // men för SEO vill du ha hela stigen.
  return `/${productSlug}`; 
}