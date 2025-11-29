import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileCart from '@/components/MobileCart';
import { CartProvider, useCart } from '@/context/CartContext';

// Helper för att lägga till varor i testet
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

// Mocka fetch för optimering (samma som i CartSidebar)
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

describe('MobileCart', () => {
  it('visar inte knappen när korgen är tom', () => {
    render(
      <CartProvider>
        <MobileCart />
      </CartProvider>
    );
    // Knappen ska inte finnas om korgen är tom
    expect(screen.queryByText(/Visa korgen/i)).not.toBeInTheDocument();
  });

  it('visar knapp och kan öppna korgen', () => {
    render(
      <CartProvider>
        <TestAddToCart />
        <MobileCart />
      </CartProvider>
    );

    // 1. Lägg till vara -> Knappen dyker upp
    fireEvent.click(screen.getByText('Lägg till vara'));
    const openBtn = screen.getByText(/Visa korgen/i);
    expect(openBtn).toBeInTheDocument();
    
    // 2. Klicka för att öppna overlayen
    fireEvent.click(openBtn);

    // 3. Nu ska rubriken "Din Varukorg" synas (den finns inne i overlayen)
    expect(screen.getByText('Din Varukorg')).toBeInTheDocument();
    expect(screen.getByText('Testprodukt')).toBeInTheDocument();
  });

  it('kan stänga korgen', () => {
    render(
      <CartProvider>
        <TestAddToCart />
        <MobileCart />
      </CartProvider>
    );

    // Lägg till och öppna
    fireEvent.click(screen.getByText('Lägg till vara'));
    fireEvent.click(screen.getByText(/Visa korgen/i));

    // Hitta stäng-knappen (krysset) och klicka.
    // Eftersom vi har en vara i korgen finns det två '✕' (en för stäng, en för ta bort vara).
    // Stäng-knappen ligger först i DOM:en (i headern).
    const closeBtns = screen.getAllByText('✕');
    const closeBtn = closeBtns[0];
    fireEvent.click(closeBtn);

    // Nu ska overlayen vara borta (rubriken borta)
    expect(screen.queryByText('Din Varukorg')).not.toBeInTheDocument();
    // Och knappen ska vara tillbaka
    expect(screen.getByText(/Visa korgen/i)).toBeInTheDocument();
  });
});