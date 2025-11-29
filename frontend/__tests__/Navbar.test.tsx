import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from '@/components/Navbar';
import { CartProvider, useCart } from '@/context/CartContext';
import { useEffect } from 'react';

// En hjälp-komponent för att lägga till saker i korgen inifrån testet
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

    // Kolla att "PrisKombo" finns (loggan)
    expect(screen.getByText(/Pris/i)).toBeInTheDocument();
    expect(screen.getByText(/Kombo/i)).toBeInTheDocument();

    // Kolla länkar
    expect(screen.getByText('Sök')).toBeInTheDocument();
    expect(screen.getByText('Kategorier')).toBeInTheDocument();
  });

  it('visar rätt antal varor i korgen', () => {
    render(
      <CartProvider>
        <Navbar />
        <TestComponent />
      </CartProvider>
    );

    // Från början ska det stå "0 varor"
    expect(screen.getByText('0')).toBeInTheDocument();

    // Klicka på knappen för att lägga till en vara
    fireEvent.click(screen.getByText('Add Item'));

    // Nu ska det stå "1"
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});