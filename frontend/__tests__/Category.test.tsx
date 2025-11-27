import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CategoryPage from '@/app/category/[id]/page';

// 1. MOCKA NAVIGATION (useParams + useRouter + useSearchParams)
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ 
    get: () => '1' // Simulerar att vi är på ?page=1
  }),
}));

// 2. MOCKA FETCH
// @ts-ignore
global.fetch = jest.fn((url: string) => {
  const urlString = url.toString();
  
  if (urlString.includes('/categories/1')) {
    return Promise.resolve({
      json: () => Promise.resolve({
        category: { id: 1, name: 'Hårvård' },
        // VIKTIGT: Mocka pagination-data så att det finns fler sidor
        pagination: { total: 40, page: 1, limit: 20, total_pages: 2 },
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
  
  return Promise.resolve({ json: () => Promise.resolve({}) });
});

describe('Category Page', () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it('hämtar och visar kategori, produkter och paginering', async () => {
    render(<CategoryPage />);

    await waitFor(() => {
      // Kategori
      expect(screen.getByRole('heading', { name: /Hårvård/i })).toBeInTheDocument();
      // Pagineringstext
      expect(screen.getByText(/Sida 1 av 2/i)).toBeInTheDocument();
      // Knapp för nästa sida ska finnas
      expect(screen.getByText(/Nästa/i)).toBeInTheDocument();
    });
  });

  it('navigerar till sida 2 när man klickar på Nästa', async () => {
    render(<CategoryPage />);

    // Vänta på att knappen renderas
    await waitFor(() => {
      expect(screen.getByText(/Nästa/i)).toBeInTheDocument();
    });

    const nextButton = screen.getByText(/Nästa/i);
    fireEvent.click(nextButton);

    // Kolla att vi försöker byta sida via routern
    expect(mockPush).toHaveBeenCalledWith('/category/1?page=2');
  });
});