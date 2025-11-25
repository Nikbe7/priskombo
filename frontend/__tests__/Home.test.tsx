import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'; // <-- Lade till denna för att fixa TypeScript-felet
import Home from '../src/app/page';

// MOCKA FETCH (Simulera backend)
// Vi använder denna struktur för att undvika TypeScript-konflikter
global.fetch = jest.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve([
      { 
        id: 1, 
        name: 'Test Shampoo', 
        ean: '123', 
        image_url: null,
        prices: [{ price: 100, store: 'Apotea', url: '#' }] 
      }
    ]),
  })
) as jest.Mock;

describe('Home Page', () => {
  it('visar sökfält och rubrik', () => {
    render(<Home />);
    
    // ÄNDRAT: Vi använder getByRole OCH tillåter mellanslag (\s*) mellan Smarta och Korgen
    expect(screen.getByRole('heading', { name: /Smarta\s*Korgen/i })).toBeInTheDocument();
    
    // Kolla att sökfältet finns
    expect(screen.getByPlaceholderText(/Sök produkt/i)).toBeInTheDocument();
  });

  it('kan söka och visa resultat', async () => {
    render(<Home />);
    
    const input = screen.getByPlaceholderText(/Sök produkt/i);
    const button = screen.getByText('Sök');

    // 1. Skriv "Shampoo" i rutan
    fireEvent.change(input, { target: { value: 'Shampoo' } });
    
    // 2. Klicka på Sök
    fireEvent.click(button);

    // 3. Vänta på att resultatet dyker upp (från vår mockade fetch ovan)
    await waitFor(() => {
      // Vi kollar efter produktnamnet
      expect(screen.getByText('Test Shampoo')).toBeInTheDocument();
      // Vi kollar efter priset
      expect(screen.getByText(/Från 100 kr/i)).toBeInTheDocument();
    });
  });
});