import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../src/app/page';

// 1. MOCKA FETCH
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
  // Använd "Fake Timers" för att kontrollera debounce
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('söker automatiskt efter att man slutat skriva (debounce)', async () => {
    render(<Home />);
    
    const input = screen.getByPlaceholderText(/Sök produkt/i);

    // 1. Skriv i rutan
    fireEvent.change(input, { target: { value: 'Shampoo' } });

    // 2. Snabbspola tiden 400ms (din debounce-tid)
    // Vi måste wrappa detta i 'act' eftersom det triggar state-uppdateringar
    act(() => {
      jest.advanceTimersByTime(400);
    });

    // 3. Nu ska sökningen ha kickat igång och vi väntar på resultatet
    await waitFor(() => {
      expect(screen.getByText('Test Shampoo')).toBeInTheDocument();
      expect(screen.getByText(/Från 100 kr/i)).toBeInTheDocument();
    });
  });
});