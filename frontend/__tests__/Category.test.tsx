import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CategoryPage from '@/app/category/[id]/page';

// 1. MOCKA USEPARAMS
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
}));

// 2. MOCKA FETCH (SMARTARE VERSION)
// Vi kollar vilken URL som anropas för att returnera rätt data
// @ts-ignore
global.fetch = jest.fn((url: string) => {
  // Om koden ber om kategorin
  if (url.toString().includes('/categories/1')) {
    return Promise.resolve({
      json: () => Promise.resolve({
        category: { id: 1, name: 'Hårvård' },
        products: [
          {
            id: 101,
            name: 'H&S Schampo',
            image_url: null,
            prices: [{ price: 45, store: 'Apotea', url: '#' }]
          }
        ]
      }),
    });
  }
  
  // Fallback (om något annat anropas)
  return Promise.resolve({
    json: () => Promise.resolve({}),
  });
});

describe('Category Page', () => {
  it('hämtar och visar kategori och produkter', async () => {
    render(<CategoryPage />);

    await waitFor(() => {
      // Rubriken ska vara kategorinamnet
      expect(screen.getByRole('heading', { name: /Hårvård/i })).toBeInTheDocument();
      
      // Produkten ska synas
      expect(screen.getByText('H&S Schampo')).toBeInTheDocument();
      
      // Priset ska synas
      expect(screen.getByText(/Från 45 kr/i)).toBeInTheDocument();
    });
  });
});