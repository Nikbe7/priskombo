import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductView from '@/components/views/ProductView'; // OBS: Vi testar nu Vyn direkt, inte sidan
import { CartProvider } from '@/context/CartContext';

// Mocka navigationen
jest.mock('next/navigation', () => ({
  useParams: () => ({ slug: ['parfym', 'lyxig-parfym-101'] }),
}));

// Vi skapar en komplett mock-produkt som matchar din nya typ
const mockProduct = {
  id: 101,
  name: 'Lyxig Parfym',
  ean: '73123456',
  slug: 'lyxig-parfym-101', // Nytt fält
  image_url: 'img.jpg',
  // Nytt format för kategori
  category: { 
      name: 'Parfym', 
      slug: 'parfym',
      parent: { name: 'Skönhet', slug: 'skonhet', parent: null } 
  },
  prices: [
    { 
      store: 'Kicks', 
      price: 500, 
      regular_price: 600,
      discount_percent: 17,
      url: '#', 
      base_shipping: 0 // Heter base_shipping nu
    },
    { 
      store: 'Lyko', 
      price: 550, 
      url: '#', 
      base_shipping: 39 
    }
  ]
};

describe('Product View', () => {
  it('visar produktinformation och butiker', async () => {
    // Vi renderar komponenten direkt med datan (eftersom vi flyttade logiken dit)
    render(
      <CartProvider>
        <ProductView product={mockProduct} />
      </CartProvider>
    );

    // 1. Kolla produktnamn
    expect(screen.getByRole('heading', { name: 'Lyxig Parfym', level: 1 })).toBeInTheDocument();

    // 2. Kolla Brödsmulor (Breadcrumbs)
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Skönhet')).toBeInTheDocument(); // Parent
    expect(screen.getByText('Parfym')).toBeInTheDocument();  // Kategori

    // 3. Kolla Butiker
    expect(screen.getByText('Kicks')).toBeInTheDocument();
    expect(screen.getByText('Lyko')).toBeInTheDocument();
  });

  it('visar rabattetikett och överstruket pris vid rea', async () => {
    render(
      <CartProvider>
        <ProductView product={mockProduct} />
      </CartProvider>
    );

    // 1. Kontrollera att rabattetiketten syns (-17%)
    const discountTag = screen.getByText('-17%');
    expect(discountTag).toBeInTheDocument();
    
    // 2. Kontrollera att det gamla priset syns och är överstruket
    const oldPrice = screen.getByText('600 kr');
    expect(oldPrice).toBeInTheDocument();
    expect(oldPrice).toHaveClass('line-through');

    // 3. Kontrollera det nya priset
    const newPrices = screen.getAllByText('500 kr');
    expect(newPrices.length).toBeGreaterThan(0);
  });
});