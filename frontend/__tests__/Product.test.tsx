import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductPage from '@/app/product/[id]/page';
import { CartProvider } from '@/context/CartContext';

// Mocka navigation
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '101' }),
}));

// Mocka fetch
// @ts-ignore
global.fetch = jest.fn((url: string) => {
  if (url.toString().includes('/products/101')) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        id: 101,
        name: 'Lyxig Parfym',
        ean: '73123456',
        image_url: 'img.jpg',
        category: 'Parfym',
        prices: [
          { store: 'Kicks', price: 500, url: '#', shipping: 0 },
          { store: 'Lyko', price: 550, url: '#', shipping: 39 }
        ]
      }),
    });
  }
  return Promise.resolve({ ok: false });
});

describe('Product Page', () => {
  it('visar produktinformation och priser', async () => {
    render(
      <CartProvider>
        <ProductPage />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Lyxig Parfym/i })).toBeInTheDocument();
      
      // Använd getAllByText för priset om det dyker upp på flera ställen
      const prices = screen.getAllByText('500 kr');
      expect(prices.length).toBeGreaterThan(0);
      
      // NYTT: Kolla att "Lägg till"-knappen finns
      expect(screen.getByText('+ Lägg till')).toBeInTheDocument();
    });
  });
});