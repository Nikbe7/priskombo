export type Deal = {
    id: number;
    name: string;
    slug: string | null;
    image_url: string | null;
    price: number;
    regular_price: number;
    store: string;
    discount_percent: number;
    url: string;
};
