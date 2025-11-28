import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '@/app/page';
import { CartProvider } from '@/context/CartContext'; // <-- Viktig import!

// Mocka fetch globalt
// @ts-ignore
global.fetch = jest.fn((url: string) => {
  const urlString = url.toString();

  if (urlString.includes('/categories')) {
    return Promise.resolve({
      json: () => Promise.resolve([
        { id: 1, name: 'Hårvård' }
      ]),
    });
  }

  if (urlString.includes('/search')) {
    return Promise.resolve({
      json: () => Promise.resolve([
        { 
          id: 1, 
          name: 'Test Shampoo', 
          ean: '123', 
          image_url: null,
          prices: [{ price: 100, store: 'Apotea', url: '#' }] 
        }
      ]),
    });
  }

  return Promise.resolve({ json: () => Promise.resolve([]) });
});

describe('Home Page', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('söker automatiskt efter debounce', async () => {
    // VIKTIGT: Wrappa komponenten i CartProvider
    render(
      <CartProvider>
        <Home />
      </CartProvider>
    );
    
    const input = screen.getByPlaceholderText(/Sök produkt/i);

    // Skriv i rutan
    fireEvent.change(input, { target: { value: 'Shampoo' } });

    // Snabbspola tiden (Debounce)
    act(() => {
      jest.advanceTimersByTime(400);
    });

    // Vänta på resultat
    await waitFor(() => {
      expect(screen.getByText('Test Shampoo')).toBeInTheDocument();
      expect(screen.getByText(/Från 100 kr/i)).toBeInTheDocument();
    });
  });
});