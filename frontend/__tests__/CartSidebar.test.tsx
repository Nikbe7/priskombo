import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CartSidebar from '@/components/CartSidebar';
import { CartProvider, useCart } from '@/context/CartContext';
import { useEffect } from 'react';

// Mocka usePathname
const mockUsePathname = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

// Helper-komponent
const TestAddToCart = () => {
  const { addToBasket, setIsCartOpen } = useCart();
  // Öppna korgen direkt när vi lägger till
  const add = () => {
      addToBasket({
        id: 99,
        name: 'Testprodukt',
        ean: '123',
        slug: 'test-produkt-slug',
        image_url: 'http://example.com/img.jpg',
        prices: [{ price: 100, store: 'TestButik', url: '#' }]
      } as any);
      setIsCartOpen(true);
  };
  return <button onClick={add}>Lägg till vara</button>;
};

describe('CartSidebar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePathname.mockReturnValue("/"); // Default: Vi är på startsidan
  });

  it('visar tom korg från början', () => {
    render(
      <CartProvider>
        {/* Tvinga öppen korg genom att manipulera context manuellt om det var möjligt, 
            men här renderar vi bara komponenten. 
            CartSidebar är "fixed" och "translate-x-full" om den är stängd.
            Vi måste öppna den för att se innehållet i DOMen visuellt, 
            men React Testing Library ser den ändå i DOMen. */}
        <CartSidebar />
      </CartProvider>
    );
    
    // Vi måste trigga öppning för att se texten visuellt, men för RTL finns den i DOM.
    // Vi kollar bara att texten finns.
    expect(screen.getByText(/Listan är tom/i)).toBeInTheDocument();
    expect(screen.queryByText(/Hitta bästa kombon/i)).not.toBeInTheDocument();
  });

  it('visar länken till optimering på startsidan', () => {
    mockUsePathname.mockReturnValue("/"); // Vi är INTE på optimize

    render(
      <CartProvider>
        <TestAddToCart />
        <CartSidebar />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Lägg till vara'));

    const optimizeLink = screen.getByRole('link', { name: /Hitta bästa kombon/i });
    expect(optimizeLink).toBeInTheDocument();
    expect(optimizeLink).toHaveAttribute('href', '/optimize');
  });

  it('DÖLJER länken till optimering om vi redan är på /optimize', () => {
    mockUsePathname.mockReturnValue("/optimize"); // Vi ÄR på optimize

    render(
      <CartProvider>
        <TestAddToCart />
        <CartSidebar />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Lägg till vara'));

    // Nu ska länken INTE finnas
    const optimizeLink = screen.queryByRole('link', { name: /Hitta bästa kombon/i });
    expect(optimizeLink).not.toBeInTheDocument();
  });
});