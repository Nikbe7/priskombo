import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileCart from '@/components/cart/MobileCart';
import CartSidebar from '@/components/cart/CartSidebar';
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
    // Knappen ska inte finnas om korgen är tom
    expect(screen.queryByText(/Visa listan/i)).not.toBeInTheDocument();
  });

  it('öppnas automatiskt vid köp, kan stängas och öppnas igen', async () => {
    render(
      <CartProvider>
        <TestAddToCart />
        <MobileCart />
        <CartSidebar /> {/* Lägg till CartSidebar */}
      </CartProvider>
    );

    // 1. Lägg till vara -> Korgen öppnas AUTOMATISKT
    fireEvent.click(screen.getByText('Lägg till vara'));
    
    // Verifiera att korgen är öppen direkt
    await waitFor(() => {
      expect(screen.getByText(/Din Inköpslista/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Testprodukt')).toBeInTheDocument();
    
    // Knappen "Visa listan" ska INTE synas nu (eftersom korgen är öppen)
    expect(screen.queryByText(/Visa listan/i)).not.toBeInTheDocument();

    // 2. Stäng korgen
    // Hitta stäng-knappen i headern och klicka på den
    fireEvent.click(screen.getByRole('button', { name: /Stäng/i }));

    // 3. Nu ska korgen vara stängd och knappen synlig igen.
    // Vi väntar på att "Visa listan" ska dyka upp, vilket bekräftar att isCartOpen är false.
    await waitFor(() => {
      expect(screen.getByText(/Visa listan/i)).toBeInTheDocument();
    });
    expect(screen.getByText("1 st")).toBeInTheDocument();

    // 4. Öppna igen manuellt
    fireEvent.click(screen.getByText(/Visa listan/i));
    await waitFor(() => {
      expect(screen.getByText(/Din Inköpslista/i)).toBeInTheDocument();
    });
  });
});
