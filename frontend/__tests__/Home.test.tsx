import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '@/app/page';
import { CartProvider } from '@/context/CartContext';

// 1. MOCKA NAVIGATION (useRouter)
// Detta krävs eftersom Home-komponenten nu använder router.push()
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// 2. MOCKA FETCH (Samma som förut)
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
  // För deals
  if (urlString.includes('/deals')) {
    return Promise.resolve({ json: () => Promise.resolve([]) });
  }

  return Promise.resolve({ json: () => Promise.resolve([]) });
});

describe('Home Page', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPush.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('söker automatiskt efter debounce och visar rätt knapp', async () => {
    render(
      <CartProvider>
        <Home />
      </CartProvider>
    );
    
    const input = screen.getByPlaceholderText(/Sök produkt/i);

    // 1. Skriv i rutan
    fireEvent.change(input, { target: { value: 'Shampoo' } });

    // 2. Snabbspola tiden (Debounce)
    act(() => {
      jest.advanceTimersByTime(400);
    });

    // 3. Vänta på resultat
    await waitFor(() => {
      expect(screen.getByText('Test Shampoo')).toBeInTheDocument();
      expect(screen.getByText(/Från 100 kr/i)).toBeInTheDocument();
      
      expect(screen.getByText('+ Lägg till')).toBeInTheDocument();
    });
  });
});