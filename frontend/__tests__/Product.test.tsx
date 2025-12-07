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
          { 
            store: 'Kicks', 
            price: 500, 
            regular_price: 600,
            discount_percent: 17,
            url: '#', 
            shipping: 0 
          },
          { 
            store: 'Lyko', 
            price: 550, 
            url: '#', 
            shipping: 39 
          }
        ]
      }),
    });
  }
  return Promise.resolve({ ok: false });
});

describe('Product Page', () => {
  it('visar produktinformation och butiker', async () => {
    render(
      <CartProvider>
        <ProductPage />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Lyxig Parfym')).toBeInTheDocument();
      expect(screen.getByText('Parfym')).toBeInTheDocument();
      expect(screen.getByText('Kicks')).toBeInTheDocument();
      expect(screen.getByText('Lyko')).toBeInTheDocument();
    });
  });

  it('visar rabattetikett och överstruket pris vid rea', async () => {
    render(
      <CartProvider>
        <ProductPage />
      </CartProvider>
    );

    await waitFor(() => {
      // 1. Kontrollera att rabattetiketten syns (-17%)
      const discountTag = screen.getByText('-17%');
      expect(discountTag).toBeInTheDocument();
      
      // 2. Kontrollera att det gamla priset syns och är överstruket
      const oldPrice = screen.getByText('600 kr');
      expect(oldPrice).toBeInTheDocument();
      expect(oldPrice).toHaveClass('line-through');

      // 3. Kontrollera det nya priset
      // FIX: Eftersom "500 kr" finns på två ställen (huvudpriset + i listan)
      // använder vi getAllByText och kollar att minst en finns.
      const newPrices = screen.getAllByText('500 kr');
      expect(newPrices.length).toBeGreaterThan(0);
    });
  });

  it('visar fraktpris istället för ordinarie pris när rabatt saknas', async () => {
    render(
      <CartProvider>
        <ProductPage />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Frakt: 39 kr')).toBeInTheDocument();
    });
  });
});