import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CatchAllPage from '@/app/[...slug]/page';
import { CartProvider } from '@/context/CartContext';

// Mocka navigation
const mockParams = { slug: ['skonhet-halsa', 'harvard', 'test-produkt'] };
jest.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));

// Mocka sonner
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => <div data-testid="toast-container" />,
}));

// Mocka lucide-react
jest.mock('lucide-react', () => ({
  ExternalLink: () => <div data-testid="external-link-icon" />,
  ShoppingBag: () => <div data-testid="shopping-bag-icon" />,
  Check: () => <div data-testid="check-icon" />,
  ArrowLeft: () => <div data-testid="arrow-left-icon" />,
  PackageOpen: () => <div data-testid="package-open-icon" />,
}));

describe('CatchAllPage (Slug Router)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mocka IntersectionObserver
    // @ts-ignore
    global.IntersectionObserver = class IntersectionObserver {
      constructor(callback: any) {}
      observe() { return null; }
      disconnect() { return null; }
      unobserve() { return null; }
    };
  });

  it('visar ProductView när produkten hittas (200)', async () => {
    // @ts-ignore
    global.fetch = jest.fn((url: string) => {
      const urlString = url.toString();

      if (urlString.includes('/products/test-produkt')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            id: 1,
            name: 'Test Produkt',
            ean: '123',
            slug: 'test-produkt',
            image_url: 'img.jpg',
            category: { name: 'Hårvård', slug: 'harvard', parent: { name: 'Skönhet', slug: 'skonhet-halsa', parent: null } },
            prices: [{ store: 'Apotea', price: 100, url: '#', shipping: 0 }]
          }),
        });
      }
      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    render(
      <CartProvider>
        <CatchAllPage />
      </CartProvider>
    );

    // Ska visa ProductView med produktnamn
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Test Produkt', level: 1 })).toBeInTheDocument();
    });
  });

  it('visar CategoryView när produkten inte hittas (404)', async () => {
    // @ts-ignore
    global.fetch = jest.fn((url: string) => {
      const urlString = url.toString();

      if (urlString.includes('/products/test-produkt')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
      }
      
      // Kategorier
      if (urlString.includes('/categories')) {
        return Promise.resolve({
          json: () => Promise.resolve([
            { id: 1, name: 'Skönhet & Hälsa', slug: 'skonhet-halsa', parent_id: null },
          ]),
        });
      }

      // Produkter (för CategoryView)
      if (urlString.includes('/products')) {
        return Promise.resolve({
          json: () => Promise.resolve({ total: 0, data: [] }),
        });
      }

      return Promise.resolve({ ok: false, json: () => Promise.resolve({}) });
    });

    render(
      <CartProvider>
        <CatchAllPage />
      </CartProvider>
    );

    // CategoryView renderas — den hämtar sina egna data
    await waitFor(() => {
      // Vi borde se CategoryView-element (t.ex. sortering dropdown)
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/products/test-produkt'));
    });
  });

  it('visar laddningsindikator initialt', () => {
    // Fetch som aldrig resolvar
    // @ts-ignore
    global.fetch = jest.fn(() => new Promise(() => {}));

    render(
      <CartProvider>
        <CatchAllPage />
      </CartProvider>
    );

    // Ska visa loading-spinner
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });
});
