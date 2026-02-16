import API_URL from "@/lib/config";
import type { Deal } from "@/types/deal";

export async function fetchDeals(limit: number = 100): Promise<Deal[]> {
    const res = await fetch(`${API_URL}/deals?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
}
