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
      slug: 'test-produkt-slug',
      image_url: 'http://example.com/img.jpg',
      prices: [{ price: 100, store: 'TestButik', url: '#' }]
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

describe('CartSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('visar tom korg från början', async () => {
    render(
      <CartProvider>
        <ForceOpenCart />
        <CartSidebar />
      </CartProvider>
    );
    
    expect(await screen.findByText(/Listan är tom/i)).toBeInTheDocument();
    // Knappen ska inte finnas eller vara disabled/gömd när listan är tom
    // I din kod: basket.length > 0 && (...) så hela footern renderas inte.
    expect(screen.queryByText(/Hitta bästa kombon/i)).not.toBeInTheDocument();
  });

  it('visar produkter och länk till optimering när varor finns', async () => {
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
    
    // 3. Kolla att länken till produktsidan finns
    const productLink = screen.getByRole('link', { name: /Testprodukt/i });
    expect(productLink).toHaveAttribute('href', '/test-produkt-slug');

    // 4. Kolla att "Hitta bästa kombon"-länken finns och pekar rätt
    // Använd en flexibel regex för att matcha texten även med pilen "➔"
    const optimizeLink = screen.getByRole('link', { name: /Hitta bästa kombon/i });
    expect(optimizeLink).toBeInTheDocument();
    expect(optimizeLink).toHaveAttribute('href', '/optimize');
  });
});