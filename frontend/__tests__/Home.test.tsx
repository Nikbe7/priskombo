import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '../src/app/page';

// VIKTIGT: En smartare mock som hanterar både /categories och /search
// @ts-ignore
global.fetch = jest.fn((url: string) => {
  const urlString = url.toString();

  // 1. Om sidan vill ha kategorier (när den laddas)
  if (urlString.includes('/categories')) {
    return Promise.resolve({
      json: () => Promise.resolve([
        { id: 1, name: 'Hårvård' },
        { id: 2, name: 'Ansiktsvård' }
      ]),
    });
  }

  // 2. Om sidan vill söka (när vi klickar på knappen)
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

  // Fallback
  return Promise.resolve({ json: () => Promise.resolve([]) });
});

describe('Home Page', () => {
  it('visar sökfält och kategorier', async () => {
    render(<Home />);
    
    expect(screen.getByRole('heading', { name: /Smarta\s*Korgen/i })).toBeInTheDocument();
    
    // Vi väntar på att kategorierna ska laddas in (fixar act-varningar)
    await waitFor(() => {
        expect(screen.getByText('Hårvård')).toBeInTheDocument();
    });
  });

  it('kan söka och visa resultat', async () => {
    render(<Home />);
    
    const input = screen.getByPlaceholderText(/Sök produkt/i);
    const button = screen.getByText('Sök');

    fireEvent.change(input, { target: { value: 'Shampoo' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Test Shampoo')).toBeInTheDocument();
      expect(screen.getByText(/Från 100 kr/i)).toBeInTheDocument();
    });
  });
});