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

// NYTT: Helper för att tvinga upp korgen (eftersom den är stängd by default)
const ForceOpenCart = () => {
  const { setIsCartOpen } = useCart();
  useEffect(() => {
    setIsCartOpen(true);
  }, [setIsCartOpen]);
  return null;
};

// Mocka fetch för optimering
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
  it('visar tom korg från början', async () => {
    render(
      <CartProvider>
        <ForceOpenCart /> {/* <-- Denna öppnar korgen så vi kan testa innehållet */}
        <CartSidebar />
      </CartProvider>
    );
    
    // Vi använder findByText för att vänta på att state-uppdateringen ska slå igenom
    expect(await screen.findByText(/Listan är tom/i)).toBeInTheDocument();
    
    expect(screen.getByText(/Hitta bästa kombon/i)).toBeDisabled();
  });

  it('kan optimera korgen när varor finns', async () => {
    render(
      <CartProvider>
        <TestAddToCart />
        <CartSidebar />
      </CartProvider>
    );

    // 1. Lägg till en vara (Detta öppnar också korgen automatiskt via logiken i Context)
    fireEvent.click(screen.getByText('Lägg till vara'));

    // 2. Kolla att den syns i korgen
    expect(screen.getByText('Testprodukt')).toBeInTheDocument();
    
    // 3. Klicka på optimera (knappen ska nu vara aktiv)
    const optimizeBtn = screen.getByText(/Hitta bästa kombon/i);
    expect(optimizeBtn).not.toBeDisabled();
    fireEvent.click(optimizeBtn);

    // 4. Vänta på resultatet
    await waitFor(() => {
      // Använd getAllByText eftersom priset visas på flera ställen
      const prices = screen.getAllByText('200 kr');
      expect(prices.length).toBeGreaterThan(0);
      
      expect(screen.getByText('Smart Split')).toBeInTheDocument();
    });
  });
});