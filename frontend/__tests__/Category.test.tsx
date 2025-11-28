import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CategoryPage from '@/app/category/[id]/page';
import { CartProvider } from '@/context/CartContext'; // <-- Import

// Mocka navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: '1' }),
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: () => '1' }),
}));

// Mocka fetch
// @ts-ignore
global.fetch = jest.fn((url: string) => {
  if (url.toString().includes('/categories/1')) {
    return Promise.resolve({
      json: () => Promise.resolve({
        category: { id: 1, name: 'Hårvård' },
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
  it('visar produkter och paginering', async () => {
    // Wrappa i CartProvider
    render(
      <CartProvider>
        <CategoryPage />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Hårvård/i })).toBeInTheDocument();
      expect(screen.getByText('H&S Schampo')).toBeInTheDocument();
      expect(screen.getByText(/Sida 1 av 2/i)).toBeInTheDocument();
    });
  });

  it('navigerar till sida 2', async () => {
    render(
      <CartProvider>
        <CategoryPage />
      </CartProvider>
    );

    await waitFor(() => {
      expect(screen.getByText(/Nästa/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Nästa/i));
    expect(mockPush).toHaveBeenCalledWith('/category/1?page=2');
  });
});