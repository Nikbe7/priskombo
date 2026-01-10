import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CartSidebar from '@/components/CartSidebar';
import { CartProvider, useCart } from '@/context/CartContext';
import { useEffect } from 'react';

// Helper-komponent för att lägga till saker i korgen
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

// Helper för att tvinga upp korgen
const ForceOpenCart = () => {
  const { setIsCartOpen } = useCart();
  useEffect(() => {
    setIsCartOpen(true);
  }, [setIsCartOpen]);
  return null;
};

// Mocka fetch
// @ts-ignore
global.fetch = jest.fn((url: string) => {
  if (url.includes('/optimize')) {
    return Promise.resolve({
      ok: true, // Viktigt att lägga till ok: true för att inte trigga throw Error
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
  return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
});

describe('CartSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Rensa mocks mellan testerna
  });

  it('visar tom korg från början', async () => {
    render(
      <CartProvider>
        <ForceOpenCart />
        <CartSidebar />
      </CartProvider>
    );
    
    expect(await screen.findByText(/Listan är tom/i)).toBeInTheDocument();
    expect(screen.getByText(/Hitta bästa kombon/i)).toBeDisabled();
  });

  it('kan optimera korgen när varor finns och skickar rätt data', async () => {
    render(
      <CartProvider>
        <TestAddToCart />
        <CartSidebar />
      </CartProvider>
    );

    // 1. Lägg till en vara
    fireEvent.click(screen.getByText('Lägg till vara'));

    // 2. Kolla att den syns
    expect(screen.getByText('Testprodukt')).toBeInTheDocument();
    
    // 3. Klicka på optimera
    const optimizeBtn = screen.getByText(/Hitta bästa kombon/i);
    expect(optimizeBtn).not.toBeDisabled();
    fireEvent.click(optimizeBtn);

    // 4. Verifiera att fetch anropades med rätt struktur (items med quantity)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/optimize'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"items":[{"product_id":99,"quantity":1}]')
        })
      );
    });

    // 5. Vänta på resultatet i UI
    await waitFor(() => {
      const prices = screen.getAllByText('200 kr');
      expect(prices.length).toBeGreaterThan(0);
      expect(screen.getByText('Smart Split')).toBeInTheDocument();
    });
  });
});