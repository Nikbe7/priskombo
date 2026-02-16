export type Category = {
    id: number;
    name: string;
    slug: string;
    parent_id: number | null;
    coming_soon: boolean;
};
