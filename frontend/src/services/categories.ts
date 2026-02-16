import API_URL from "@/lib/config";
import type { Category } from "@/types/category";

export async function fetchCategories(): Promise<Category[]> {
    const res = await fetch(`${API_URL}/categories`);
    if (!res.ok) throw new Error(`Kunde inte hämta kategorier: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}
