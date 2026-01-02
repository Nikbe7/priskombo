import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '@/app/page';
import { CartProvider } from '@/context/CartContext';

// Mocka router
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mocka fetch
// @ts-ignore
global.fetch = jest.fn((url: string) => {
  const urlString = url.toString();

  if (urlString.includes('/categories')) {
    return Promise.resolve({
      json: () => Promise.resolve([
        { id: 1, name: 'Hårvård', slug: 'harvard', parent_id: null, coming_soon: false }
      ]),
    });
  }

  if (urlString.includes('/search')) {
    return Promise.resolve({
      json: () => Promise.resolve([
        { 
          id: 1, 
          name: 'Test Shampoo', 
          slug: 'test-shampoo', // Nytt
          image_url: null,
          category: { name: 'Hårvård', slug: 'harvard' }, // Nytt
          prices: [{ price: 100, store: 'Apotea', url: '#', base_shipping: 0 }] 
        }
      ]),
    });
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

  it('söker automatiskt efter debounce', async () => {
    render(
      <CartProvider>
        <Home />
      </CartProvider>
    );
    
    const input = screen.getByPlaceholderText(/Sök produkt/i);

    fireEvent.change(input, { target: { value: 'Shampoo' } });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Shampoo')).toBeInTheDocument();
      expect(screen.getByText(/Från 100 kr/i)).toBeInTheDocument();
    });
  });
});