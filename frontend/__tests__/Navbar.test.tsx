import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from '@/components/Navbar';
import { CartProvider, useCart } from '@/context/CartContext';

// 1. VIKTIGT: Mocka usePathname eftersom Navbar använder det
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

// Helper-komponent
const TestComponent = () => {
  const { addToBasket } = useCart();
  return (
    <button onClick={() => addToBasket({ 
      id: 1, 
      name: 'Test', 
      ean: '123', 
      slug: 'test',
      category: null,
      image_url: '', 
      prices: [] 
    })}>
      Add Item
    </button>
  );
};

describe('Navbar', () => {
  it('visar logotyp och länkar', () => {
    render(
      <CartProvider>
        <Navbar />
      </CartProvider>
    );

    expect(screen.getByText(/Pris/i)).toBeInTheDocument();
    expect(screen.getByText(/Kombo/i)).toBeInTheDocument();
    expect(screen.getByText('Sök')).toBeInTheDocument();
    expect(screen.getByText(/Deals/i)).toBeInTheDocument();
    expect(screen.getByText(/Min lista/i)).toBeInTheDocument();
  });

  // UPPDATERAT TEST HÄR:
  it('visar totalt antal varor (quantity) i korgen', () => {
    render(
      <CartProvider>
        <Navbar />
        <TestComponent />
      </CartProvider>
    );

    // 1. Tom korg -> Ingen badge
    expect(screen.queryByText('0')).not.toBeInTheDocument();

    const addButton = screen.getByText('Add Item');

    // 2. Lägg till 1 vara -> Badge visar "1"
    fireEvent.click(addButton);
    expect(screen.getByText('1')).toBeInTheDocument();

    // 3. Lägg till SAMMA vara igen -> Badge ska visa "2"
    // (Detta bekräftar att du använder totalItems och inte basket.length)
    fireEvent.click(addButton);
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});