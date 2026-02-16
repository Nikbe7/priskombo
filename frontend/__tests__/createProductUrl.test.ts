import { createProductUrl } from '@/lib/utils';

describe('createProductUrl', () => {
    it('bygger URL med parent-kategori, kategori och slug', () => {
        const result = createProductUrl(1, 'test-produkt', 'Test Produkt', 'harvard', 'skonhet-halsa');
        expect(result).toBe('/skonhet-halsa/harvard/test-produkt');
    });

    it('bygger URL med bara kategori och slug (ingen parent)', () => {
        const result = createProductUrl(2, 'schampo-lyx', 'Schampo Lyx', 'harvard');
        expect(result).toBe('/harvard/schampo-lyx');
    });

    it('bygger URL med bara slug om ingen kategori finns', () => {
        const result = createProductUrl(3, 'enkel-produkt', 'Enkel Produkt');
        expect(result).toBe('/enkel-produkt');
    });

    it('genererar slug från namn om slug är null', () => {
        const result = createProductUrl(4, null, 'Min Fina Produkt');
        expect(result).toBe('/min-fina-produkt');
    });

    it('genererar slug från namn med kategori om slug är null', () => {
        const result = createProductUrl(5, null, 'Schampo Deluxe', 'harvard');
        expect(result).toBe('/harvard/schampo-deluxe');
    });

    it('hanterar specialtecken korrekt vid slug-generering', () => {
        const result = createProductUrl(6, null, 'Produkt (500ml) & Extra!');
        // Specialtecken ersätts med bindestreck, ledande/avslutande bindestreck tas bort
        expect(result).toMatch(/^\/[a-z0-9-]+$/);
        expect(result).not.toMatch(/--/); // Inga dubbla bindestreck (om implementerat)
    });
});
