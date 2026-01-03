import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CategoryView from '@/components/views/CategoryView'; // Uppdaterad import
import { CartProvider } from '@/context/CartContext';

// 1. Mocka IntersectionObserver
beforeEach(() => {
  // @ts-ignore
  global.IntersectionObserver = class IntersectionObserver {
    constructor(callback: any) { this.callback = callback; }
    observe() { return null; }
    disconnect() { return null; }
    unobserve() { return null; }
  };
});

// 2. Mocka Navigation
const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockParams = { slug: ['skonhet-halsa', 'harvard'] };

jest.mock('next/navigation', () => ({
  __esModule: true,
  useParams: () => mockParams,
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(''),
}));

// 3. Mocka Fetch med NYA datastrukturen
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

  // PRODUKTER (Nytt format: { data: [], total: 100 })
  if (urlString.includes('/products')) {
    return Promise.resolve({
      json: () => Promise.resolve({
        total: 150, // <-- Backend skickar nu total count
        data: [
          {
            id: 10,
            name: 'Lyxigt Schampo',
            slug: 'lyxigt-schampo',
            image_url: 'img.jpg',
            category: { name: 'Hårvård', slug: 'harvard' }, // Objekt
            rating: 4.5,
            prices: [{ price: 89, store: 'Apotea', url: '#', base_shipping: 0 }]
          }
        ]
      }),
    });
  }

  return Promise.resolve({ json: () => Promise.resolve({}) });
});

describe('Category View', () => {
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
      expect(screen.getByText(/1 \/ 150 produkter/i)).toBeInTheDocument();
    });
  });

  it('visar skeletons medan data laddas', async () => {
    // 1. Mocka en fetch som ALDRIG svarar (simulerar evig laddning)
    // Detta tvingar komponenten att stanna i "loading"-läget
    // @ts-ignore
    global.fetch = jest.fn(() => new Promise(() => {}));

    render(
      <CartProvider>
        <CategoryView />
      </CartProvider>
    );

    // 2. Hitta skeletons via test-id (som vi lade till i ProductCardSkeleton)
    const skeletons = screen.getAllByTestId('product-skeleton');
    
    // 3. Verifiera att vi visar 6 stycken (enligt din loop [...Array(6)])
    expect(skeletons.length).toBe(6);
    
    // 4. Verifiera att animationen "pulse" finns
    expect(skeletons[0].querySelector('.animate-pulse')).toBeInTheDocument();
  });
});