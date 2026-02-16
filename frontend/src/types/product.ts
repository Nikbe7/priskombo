export type Product = {
    id: number;
    name: string;
    ean: string;
    slug: string | null;
    image_url: string | null;
    category: { name: string; slug: string } | null;
    prices: { price: number; store: string; url: string }[];
};

export type CartItem = Product & { quantity: number };

export type CategoryLink = {
    name: string;
    slug: string;
    parent?: CategoryLink | null;
};

export type ProductDetails = {
    id: number;
    name: string;
    ean: string;
    slug: string | null;
    image_url: string | null;
    category: CategoryLink | null;
    prices: {
        store: string;
        price: number;
        regular_price?: number;
        discount_percent?: number;
        url: string;
        shipping?: number;
    }[];
};
