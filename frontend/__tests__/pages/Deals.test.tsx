import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DealsPage from '@/app/deals/page';
import { CartProvider } from '@/context/CartContext';

// Mocka fetch för att returnera deals
// @ts-ignore
global.fetch = jest.fn((url: string) => {
  if (url.toString().includes('/deals')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([
        {
          id: 1,
          name: 'Super Schampo',
          slug: 'super-schampo',
          image_url: 'img.jpg',
          price: 80,
          regular_price: 100,
          store: 'Apotea',
          discount_percent: 20,
          url: '#'
        }
      ]),
    });
  }
  return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
});

describe('Deals Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('visar lista på deals och rabatter', async () => {
    render(
      <CartProvider>
        <DealsPage />
      </CartProvider>
    );

    await waitFor(() => {
      // Kolla rubrik
      expect(screen.getByRole('heading', { name: /Super\s*Deals/i })).toBeInTheDocument();
      
      // Kolla att produkten syns
      expect(screen.getByText('Super Schampo')).toBeInTheDocument();
      
      // Kolla att gamla priset visas och är överstruket
      const oldPrice = screen.getByText('100 kr');
      expect(oldPrice).toBeInTheDocument();
      expect(oldPrice).toHaveClass('line-through');

      // Kolla att rabatten syns (både pris och procent)
      expect(screen.getByText('80 kr')).toBeInTheDocument();
      expect(screen.getByText('-20%')).toBeInTheDocument();

      // NYTT: Kolla att knappen har rätt text (konsekvent med resten av sajten)
      expect(screen.getByText('+ Lägg till')).toBeInTheDocument();
    });
  });

  it('visar tomt tillstånd om inga deals finns', async () => {
    // @ts-ignore - Skriv över global fetch för detta test
    global.fetch = jest.fn(() =>
      Promise.resolve({ json: () => Promise.resolve([]) })
    );

    render(
      <CartProvider>
        <DealsPage />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Hittade inga deals just nu/i)).toBeInTheDocument();
    });
  });

  it('visar laddningstext medan data hämtas', () => {
    // @ts-ignore - Fetch som aldrig resolvar
    global.fetch = jest.fn(() => new Promise(() => {}));

    render(
      <CartProvider>
        <DealsPage />
      </CartProvider>
    );

    expect(screen.getByText(/Letar efter fynd/i)).toBeInTheDocument();
  });
});
