import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DealsPage from '@/app/deals/page';
import { CartProvider } from '@/context/CartContext';

// Mocka fetch för att returnera deals
// @ts-ignore
global.fetch = jest.fn((url: string) => {
  if (url.toString().includes('/deals')) {
    return Promise.resolve({
      json: () => Promise.resolve([
        {
          id: 1,
          name: 'Super Schampo',
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
  return Promise.resolve({ json: () => Promise.resolve([]) });
});

describe('Deals Page', () => {
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
      
      // Kolla att rabatten syns (både pris och procent)
      expect(screen.getByText('80 kr')).toBeInTheDocument();
      expect(screen.getByText('-20%')).toBeInTheDocument();

      // NYTT: Kolla att knappen har rätt text (konsekvent med resten av sajten)
      expect(screen.getByText('+ Lägg till')).toBeInTheDocument();
    });
  });
});