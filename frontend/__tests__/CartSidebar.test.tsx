import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CartSidebar from '@/components/CartSidebar';
import { CartProvider, useCart } from '@/context/CartContext';

const TestAddToCart = () => {
  const { addToBasket } = useCart();
  return (
    <button onClick={() => addToBasket({
      id: 99,
      name: 'Testprodukt',
      ean: '123',
      image_url: '',
      prices: []
    } as any)}>
      Lägg till vara
    </button>
  );
};

// @ts-ignore
global.fetch = jest.fn((url: string) => {
  if (url.includes('/optimize')) {
    return Promise.resolve({
      json: () => Promise.resolve([
        {
          type: 'Smart Split',
          total_cost: 200,
          stores: ['Apotea'],
          details: [{ store: 'Apotea', products_cost: 150, shipping: 50 }]
        }
      ]),
    });
  }
  return Promise.resolve({ json: () => Promise.resolve([]) });
});

describe('CartSidebar', () => {
  it('visar tom korg från början', () => {
    render(
      <CartProvider>
        <CartSidebar />
      </CartProvider>
    );
    // ÄNDRAT: Letar efter "Listan är tom"
    expect(screen.getByText(/Listan är tom/i)).toBeInTheDocument();
    
    // ÄNDRAT: Letar efter "Hitta bästa kombon"
    expect(screen.getByText(/Hitta bästa kombon/i)).toBeDisabled();
  });

  it('kan optimera korgen när varor finns', async () => {
    render(
      <CartProvider>
        <TestAddToCart />
        <CartSidebar />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Lägg till vara'));
    expect(screen.getByText('Testprodukt')).toBeInTheDocument();
    
    // ÄNDRAT: Letar efter den nya knapptexten
    const optimizeBtn = screen.getByText(/Hitta bästa kombon/i);
    expect(optimizeBtn).not.toBeDisabled();
    fireEvent.click(optimizeBtn);

    await waitFor(() => {
      const prices = screen.getAllByText('200 kr');
      expect(prices.length).toBeGreaterThan(0);
      expect(screen.getByText('Smart Split')).toBeInTheDocument();
    });
  });
});