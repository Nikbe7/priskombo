import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from '@/components/Navbar';
import { CartProvider, useCart } from '@/context/CartContext';

// Helper-komponent för att lägga till saker i korgen
const TestComponent = () => {
  const { addToBasket } = useCart();
  return (
    <button onClick={() => addToBasket({ 
      id: 1, 
      name: 'Test', 
      ean: '123', 
      image_url: '', 
      prices: [] 
    } as any)}>
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

    // Kolla att loggan finns
    expect(screen.getByText(/Pris/i)).toBeInTheDocument();
    expect(screen.getByText(/Kombo/i)).toBeInTheDocument();

    // Kolla länkar
    expect(screen.getByText('Sök')).toBeInTheDocument();
    // ÄNDRAT: Vi kollar efter "Deals" istället för "Kategorier"
    expect(screen.getByText(/Deals/i)).toBeInTheDocument();
  });

  it('visar rätt antal varor i korgen', () => {
    render(
      <CartProvider>
        <Navbar />
        <TestComponent />
      </CartProvider>
    );

    // ÄNDRAT: Den nya designen döljer badgen om korgen är tom.
    // Vi kollar att siffran 0 INTE finns i dokumentet.
    expect(screen.queryByText('0')).not.toBeInTheDocument();

    // Klicka på knappen för att lägga till en vara
    fireEvent.click(screen.getByText('Add Item'));

    // Nu ska badgen dyka upp med siffran 1
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});