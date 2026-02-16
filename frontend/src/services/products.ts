import API_URL from "@/lib/config";
import type { Product, ProductDetails } from "@/types/product";

export async function searchProducts(query: string): Promise<Product[]> {
    const res = await fetch(
        `${API_URL}/search?q=${encodeURIComponent(query)}`
    );
    if (!res.ok) throw new Error("Nätverksfel");
    return res.json();
}

export async function fetchProductBySlug(
    slug: string
): Promise<ProductDetails | null> {
    const res = await fetch(`${API_URL}/products/${slug}`);
    if (!res.ok) return null;
    return res.json();
}

export async function fetchCategoryProducts(
    categoryIds: number[],
    options: {
        skip?: number;
        limit?: number;
        search?: string;
        sort?: string;
    } = {}
): Promise<{ data: Product[]; total: number }> {
    const query = new URLSearchParams();
    categoryIds.forEach((id) => query.append("category_ids", id.toString()));

    if (options.skip !== undefined) query.set("skip", options.skip.toString());
    if (options.limit !== undefined) query.set("limit", options.limit.toString());
    if (options.search) query.set("search", options.search);
    if (options.sort && options.sort !== "popularity")
        query.set("sort", options.sort);

    const res = await fetch(`${API_URL}/products/?${query.toString()}`);
    return res.json();
}
