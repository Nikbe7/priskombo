import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileCart from '@/components/MobileCart';
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

describe('MobileCart', () => {
  it('visar inte knappen när korgen är tom', () => {
    render(
      <CartProvider>
        <MobileCart />
      </CartProvider>
    );
    // ÄNDRAT: Letar efter "Visa listan"
    expect(screen.queryByText(/Visa listan/i)).not.toBeInTheDocument();
  });

  it('visar knapp och kan öppna korgen', () => {
    render(
      <CartProvider>
        <TestAddToCart />
        <MobileCart />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Lägg till vara'));
    
    // ÄNDRAT: Letar efter "Visa listan"
    const openBtn = screen.getByText(/Visa listan/i);
    expect(openBtn).toBeInTheDocument();
    
    fireEvent.click(openBtn);

    // ÄNDRAT: Letar efter "Din Inköpslista"
    expect(screen.getByText('Din Inköpslista')).toBeInTheDocument();
    expect(screen.getByText('Testprodukt')).toBeInTheDocument();
  });

  it('kan stänga korgen', () => {
    render(
      <CartProvider>
        <TestAddToCart />
        <MobileCart />
      </CartProvider>
    );

    fireEvent.click(screen.getByText('Lägg till vara'));
    fireEvent.click(screen.getByText(/Visa listan/i));

    const closeBtns = screen.getAllByText('✕');
    const closeBtn = closeBtns[0];
    fireEvent.click(closeBtn);

    // ÄNDRAT: Letar efter "Din Inköpslista"
    expect(screen.queryByText('Din Inköpslista')).not.toBeInTheDocument();
    expect(screen.getByText(/Visa listan/i)).toBeInTheDocument();
  });
});