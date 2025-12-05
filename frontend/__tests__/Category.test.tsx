import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
// VIKTIGT: Vi importerar nu från din slug-baserade sida
import DynamicCategoryPage from '@/app/[...slug]/page';
import { CartProvider } from '@/context/CartContext';

// 1. Mocka IntersectionObserver (används för infinite scroll)
// Detta krävs för att komponenten inte ska krascha i testmiljön
beforeEach(() => {
  // @ts-ignore
  global.IntersectionObserver = class IntersectionObserver {
    constructor(callback: any) {
      this.callback = callback;
    }
    observe() { return null; }
    disconnect() { return null; }
    unobserve() { return null; }
  };
});

// 2. Mocka Navigation
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  // Simulera att vi är på URL:en /skonhet-halsa/harvard
  useParams: () => ({ slug: ['skonhet-halsa', 'harvard'] }),
  useRouter: () => ({ 
    push: mockPush,
    replace: mockReplace 
  }),
  useSearchParams: () => ({ 
    get: (key: string) => null,
    toString: () => '' 
  }),
}));

// 3. Mocka Fetch
// @ts-ignore
global.fetch = jest.fn((url: string) => {
  const urlString = url.toString();

  // Mocka /categories response (för att bygga upp sidstrukturen)
  if (urlString.includes('/categories')) {
    return Promise.resolve({
      json: () => Promise.resolve([
        { id: 1, name: 'Skönhet & Hälsa', slug: 'skonhet-halsa', parent_id: null },
        { id: 2, name: 'Hårvård', slug: 'harvard', parent_id: 1 }
      ]),
    });
  }

  // Mocka /products response
  // VIKTIGT: Returnera det nya formatet { total: number, data: [] }
  if (urlString.includes('/products')) {
    return Promise.resolve({
      json: () => Promise.resolve({
        total: 150, // Totalt antal produkter
        data: [
          {
            id: 101,
            name: 'Lyxigt Schampo',
            image_url: null,
            category_id: 2,
            prices: [{ price: 89, store: 'Lyko', url: '#' }]
          }
        ]
      }),
    });
  }
  
  return Promise.resolve({ json: () => Promise.resolve({}) });
});

describe('Dynamic Category Page', () => {
  it('visar korrekt brödsmulor och produktdata', async () => {
    render(
      <CartProvider>
        <DynamicCategoryPage />
      </CartProvider>
    );

    await waitFor(() => {
      // 1. Kolla Huvudrubrik (Kategorinamn)
      // FIXAT: Lade till level: 1 för att specifikt matcha <h1> och ignorera <h3> i sidopanelen
      expect(screen.getByRole('heading', { name: /Hårvård/i, level: 1 })).toBeInTheDocument();
      
      // 2. Kolla Brödsmulor (Parent category name)
      // "Skönhet & Hälsa" ska finnas som länk i toppen
      expect(screen.getByText('Skönhet & Hälsa')).toBeInTheDocument();

      // 3. Kolla Produkt
      expect(screen.getByText('Lyxigt Schampo')).toBeInTheDocument();
      expect(screen.getByText('89 kr')).toBeInTheDocument();

      // 4. Kolla "Total antal" texten (1 / 150 produkter)
      expect(screen.getByText(/1 \/ 150 produkter/i)).toBeInTheDocument();
    });
  });

  it('kan ändra sortering', async () => {
    render(
      <CartProvider>
        <DynamicCategoryPage />
      </CartProvider>
    );

    // Vänta på att sidan laddas och produkten syns
    await waitFor(() => screen.getByText('Lyxigt Schampo'));

    // Hitta select-boxen för sortering
    const sortSelect = screen.getByRole('combobox'); 

    // Ändra till "Lägsta pris"
    fireEvent.change(sortSelect, { target: { value: 'price_asc' } });

    // Verifiera att URL uppdateras med ?sort=price_asc
    // OBS: Komponenten kör router.push med hela sökvägen
    await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('sort=price_asc'));
    });
  });
});