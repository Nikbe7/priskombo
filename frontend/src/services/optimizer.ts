import API_URL from "@/lib/config";

export interface OptimizeItem {
    product_id: number;
    quantity: number;
}

export async function fetchOptimization(
    items: OptimizeItem[]
): Promise<any[]> {
    const res = await fetch(`${API_URL}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
    });

    if (!res.ok) throw new Error("Kunde inte optimera korgen just nu.");
    return res.json();
}
