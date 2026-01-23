import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductView from '@/components/views/ProductView';
import { CartProvider } from '@/context/CartContext';
import { Toaster } from 'sonner';

// Mocka next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mocka sonner
jest.mock('sonner', () => ({
  Toaster: () => <div data-testid="toast-container" />,
  toast: {
    success: jest.fn(),
  },
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ...jest.requireActual('lucide-react'),
  ExternalLink: () => <div data-testid="external-link-icon" />,
  ShoppingBag: () => <div data-testid="shopping-bag-icon" />,
  Check: () => <div data-testid="check-icon" />,
}));

// Utökad mock-produkt för att testa sortering och frakt
const mockProduct = {
  id: 101,
  name: 'Lyxig Parfym',
  ean: '73123456',
  slug: 'lyxig-parfym-101',
  image_url: 'img.jpg',
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
      url: 'https://kicks.se', 
      shipping: 49
    },
    { 
      store: 'Bangerhead', 
      price: 520, 
      url: 'https://bangerhead.se', 
      shipping: 0 // Blir billigast med frakt
    },
    { 
      store: 'Lyko', 
      price: 510, 
      url: 'https://lyko.se', 
      shipping: 39 
    }
  ]
};

const renderComponent = () => {
    render(
      <CartProvider>
        <ProductView product={mockProduct} />
        <Toaster />
      </CartProvider>
    );
}

describe('ProductView', () => {

  beforeEach(() => {
    // Rensa mocks före varje test
    jest.clearAllMocks();
  });

  it('renderar all grundläggande produktinformation korrekt vid första anblick', () => {
    renderComponent();

    // Brödsmulor
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('Skönhet')).toBeInTheDocument();
    expect(screen.getByText('Parfym')).toBeInTheDocument();
    // Namnet finns på flera ställen, vi kollar att det finns. H1 kollas separat.
    expect(screen.getAllByText(mockProduct.name)[0]).toBeInTheDocument();

    // Huvudproduktkort
    expect(screen.getByRole('heading', { name: mockProduct.name, level: 1 })).toBeInTheDocument();
    expect(screen.getByText('EAN: ' + mockProduct.ean)).toBeInTheDocument();
    
    // Konsekvent lägstapris uppe, oavsett frakt. Finns på flera ställen, så använd getAllByText.
    expect(screen.getAllByText(/500 kr/)[0]).toBeInTheDocument();
    expect(screen.getByText(/3 butiker/i)).toBeInTheDocument();

    // Lägg till-knapp
    const addToCartButton = screen.getByRole('button', { name: /Lägg till i inköpslistan/i });
    expect(addToCartButton).toBeInTheDocument();
    expect(screen.getByTestId('shopping-bag-icon')).toBeInTheDocument();

    // Jämför-sektion
    expect(screen.getByRole('heading', { name: /Jämför priser/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Inkludera frakt/i)).toBeInTheDocument();
  });

  it('sorterar prislistan efter enbart produktpris initialt', () => {
    renderComponent();
    
    const priceListItems = screen.getAllByTestId('price-offer');

    // 1. Kicks ska vara först (pris 500)
    expect(priceListItems[0]).toHaveTextContent('Kicks');
    expect(priceListItems[0]).toHaveTextContent('Bäst pris'); // Bäst pris-etikett
    expect(priceListItems[0]).toHaveTextContent('600 kr'); // Överstruket pris
    
    // 2. Lyko ska vara tvåa (pris 510)
    expect(priceListItems[1]).toHaveTextContent('Lyko');
    expect(priceListItems[1]).not.toHaveTextContent('Bäst pris');

    // 3. Bangerhead ska vara sist (pris 520)
    expect(priceListItems[2]).toHaveTextContent('Bangerhead');
    expect(priceListItems[2]).not.toHaveTextContent('Bäst pris');

    // Fraktkostnader (t.ex. "+ 49 kr frakt") ska INTE synas, men etiketten "Inkludera frakt" är OK.
    expect(screen.queryByText(/\+ \d+ kr frakt/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fri frakt/i)).not.toBeInTheDocument();
  });

  it('sorterar om listan och visar frakt när "Inkludera frakt" aktiveras', async () => {
    renderComponent();

    const shippingToggle = screen.getByLabelText(/Inkludera frakt/i);
    fireEvent.click(shippingToggle);

    let priceListItems;

    await waitFor(() => {
      priceListItems = screen.getAllByTestId('price-offer');
      // Bangerhead ska nu vara först (520 + 0 = 520 kr)
      expect(priceListItems[0]).toHaveTextContent('Bangerhead');
    });

    priceListItems = screen.getAllByTestId('price-offer');

    // 1. Bangerhead (520 + 0 = 520 kr)
    expect(priceListItems[0]).toHaveTextContent('Bangerhead');
    expect(priceListItems[0]).toHaveTextContent('Bäst pris');
    expect(priceListItems[0]).toHaveTextContent('Fri frakt');

    // Eftersom Kicks och Lyko har samma totalpris (549), beror deras ordning på
    // implementationen av Array.sort. För att göra testet robust kollar vi bara
    // att Kicks har rätt innehåll, oavsett om den är på plats 1 eller 2.
    const kicksElement = priceListItems.find(item => item.textContent?.includes('Kicks'));
    const lykoElement = priceListItems.find(item => item.textContent?.includes('Lyko'));
    
    expect(kicksElement).not.toBeUndefined();
    expect(lykoElement).not.toBeUndefined();

    // Kicks (500 + 49 = 549 kr)
    expect(kicksElement).not.toHaveTextContent('Bäst pris');
    expect(kicksElement).toHaveTextContent('+ 49 kr frakt');

    // Lyko (510 + 39 = 549 kr)
    expect(lykoElement).not.toHaveTextContent('Bäst pris');
    expect(lykoElement).toHaveTextContent('+ 39 kr frakt');
  });

  it('kan lägga till en produkt i varukorgen och visa en toast', async () => {
    const toastSuccess = jest.spyOn(require('sonner').toast, 'success');
    renderComponent();

    const addToCartButton = screen.getByRole('button', { name: /Lägg till i inköpslistan/i });
    fireEvent.click(addToCartButton);

    // Verifiera att toast-funktionen anropades korrekt
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith(
        `${mockProduct.name} har lagts till i din lista!`
      );
    });
  });
});