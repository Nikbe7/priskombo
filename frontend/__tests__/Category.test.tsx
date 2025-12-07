import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DynamicCategoryPage from '@/app/[...slug]/page';
import { CartProvider } from '@/context/CartContext';

// 1. Mocka IntersectionObserver
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

// 2. Mocka Navigation (Next.js App Router)
const mockReplace = jest.fn();
const mockPush = jest.fn();

// Skapa stabila objekt för att undvika oändliga loopar i useEffect
const mockParams = { slug: ['skonhet-halsa', 'harvard'] };
const mockSearchParams = new URLSearchParams('');

jest.mock('next/navigation', () => {
  return {
    __esModule: true,
    useParams: () => mockParams,
    useRouter: () => ({ 
      push: mockPush,     // Används oftast för sortering
      replace: mockReplace // Används ibland för filter
    }),
    usePathname: () => '/skonhet-halsa/harvard', // VIKTIGT: Behövs för att bygga URL
    useSearchParams: () => mockSearchParams,
  };
});

// 3. Mocka Fetch
// @ts-ignore
global.fetch = jest.fn((url: string) => {
  const urlStr = url.toString();

  // Mocka kategorier
  if (urlStr.includes('/categories')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([
        { 
          id: 10, 
          name: 'Skönhet & Hälsa', 
          slug: 'skonhet-halsa', 
          parent_id: null, 
          coming_soon: false 
        },
        { 
          id: 11, 
          name: 'Hårvård', 
          slug: 'harvard', 
          parent_id: 10, 
          coming_soon: false 
        }
      ]),
    });
  }

  // Mocka produkter
  if (urlStr.includes('products')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        data: [
          {
            id: 101,
            name: 'Lyxigt Schampo',
            ean: '73123456',
            image_url: null,
            prices: [{ price: 89, store: 'Apotea', url: '#', shipping: 49 }]
          }
        ],
        total: 150
      }),
    });
  }
  
  return Promise.resolve({
    ok: false,
    json: () => Promise.resolve([])
  });
});

describe('Dynamic Category Page', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockReplace.mockClear();
  });

  it('visar korrekt brödsmulor och produktdata', async () => {
    render(
      <CartProvider>
        <DynamicCategoryPage />
      </CartProvider>
    );

    await waitFor(() => {
      // 1. Kolla Huvudrubrik
      expect(screen.getByRole('heading', { name: /Hårvård/i, level: 1 })).toBeInTheDocument();
      
      // 2. Kolla Brödsmulor
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

    // Vänta på att sidan laddas
    await waitFor(() => screen.getByText('Lyxigt Schampo'));

    // Byt sortering
    const sortSelect = screen.getByRole('combobox');
    fireEvent.change(sortSelect, { target: { value: 'price_asc' } });

    // Verifiera att URL:en uppdateras via router.push (eftersom det var det som användes i originalkoden)
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringContaining('sort=price_asc'));
    });
  });
});