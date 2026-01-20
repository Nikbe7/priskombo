import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CategoryView from '@/components/views/CategoryView';
import { CartProvider } from '@/context/CartContext';

// Mocka Navigation
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockParams = { slug: ['skonhet-halsa', 'harvard'] };

jest.mock('next/navigation', () => ({
  __esModule: true,
  useParams: () => mockParams,
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(''),
}));

describe('Category View', () => {

  beforeEach(() => {
    // 1. Mocka IntersectionObserver
    // @ts-ignore
    global.IntersectionObserver = class IntersectionObserver {
      constructor(callback: any) { this.callback = callback; }
      observe() { return null; }
      disconnect() { return null; }
      unobserve() { return null; }
    };
    
    // 2. Mocka Fetch med en standardimplementation för de flesta tester
    // @ts-ignore
    global.fetch = jest.fn((url: string) => {
      const urlString = url.toString();

      // KATEGORIER
      if (urlString.includes('/categories')) {
        return Promise.resolve({
          json: () => Promise.resolve([
            { id: 1, name: 'Skönhet & Hälsa', slug: 'skonhet-halsa', parent_id: null },
            { id: 2, name: 'Hårvård', slug: 'harvard', parent_id: 1 }
          ]),
        });
      }

      // PRODUKTER
      if (urlString.includes('/products')) {
        return Promise.resolve({
          json: () => Promise.resolve({
            total: 150,
            data: [
              {
                id: 10,
                name: 'Lyxigt Schampo',
                slug: 'lyxigt-schampo',
                image_url: 'img.jpg',
                category: { name: 'Hårvård', slug: 'harvard' },
                rating: 4.5,
                prices: [{ price: 89, store: 'Apotea', url: '#', base_shipping: 0 }]
              }
            ]
          }),
        });
      }

      return Promise.resolve({ json: () => Promise.resolve({}) });
    });
  });

  it('visar korrekt brödsmulor och produktdata', async () => {
    render(
      <CartProvider>
        <CategoryView />
      </CartProvider>
    );

    await waitFor(() => {
      // 1. Rubrik
      expect(screen.getByRole('heading', { name: /Hårvård/i, level: 1 })).toBeInTheDocument();
      
      // 2. Parent-kategori i brödsmulor
      expect(screen.getByText('Skönhet & Hälsa')).toBeInTheDocument();

      // 3. Produkt
      expect(screen.getByText('Lyxigt Schampo')).toBeInTheDocument();
      expect(screen.getByText('89 kr')).toBeInTheDocument();

      // 4. Total antal
      expect(screen.getByText("1 / 150 produkter")).toBeInTheDocument();
    });
  });

  it('visar skeletons medan data laddas', async () => {
    // Ordinera en specifik fetch-mock BARA för denna testen
    // @ts-ignore
    global.fetch = jest.fn(() => new Promise(() => {}));

    render(
      <CartProvider>
        <CategoryView />
      </CartProvider>
    );

    const skeletons = screen.getAllByTestId('product-skeleton');
    expect(skeletons.length).toBe(6);
    expect(skeletons[0].querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('visar sorterings-dropdown med korrekta alternativ', async () => {
    render(
      <CartProvider>
        <CategoryView />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Hårvård/i, level: 1 })).toBeInTheDocument();
    });
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Populärast' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pris (Lågt - Högt)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Pris (Högt - Lågt)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Betyg' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Namn (A-Ö)' })).toBeInTheDocument();
  });
});