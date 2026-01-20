import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Navbar from '@/components/Navbar';
import { CartProvider } from '@/context/CartContext';

// 1. Mocka router och searchParams
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: () => "" }),
}));

// 2. Mocka useDebounce för att slippa timers
// Vi gör den synkron: den returnerar värdet direkt.
jest.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: any) => value,
}));

// 3. Mocka fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;


describe('Navbar', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup default fetch response for suggestions
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        categories: [],
        brands: ["TestBrand"],
        products: []
      })
    });
  });

  it('visar logotyp, länkar och sökfält', () => {
    render(
      <CartProvider>
        <Navbar />
      </CartProvider>
    );
    expect(screen.getByText(/Pris/i)).toBeInTheDocument();
    // Since SearchBar is rendered for both desktop and mobile, we expect two inputs.
    const searchInputs = screen.getAllByPlaceholderText(/Sök efter produkt/i);
    expect(searchInputs.length).toBeGreaterThan(0);
    expect(searchInputs[0]).toBeInTheDocument();
  });

  it("hämtar sökförslag när man skriver i ett av sökfälten", async () => {
    render(
      <CartProvider>
        <Navbar />
      </CartProvider>
    );

    // Get both search inputs (desktop and mobile)
    const inputs = screen.getAllByPlaceholderText(/Sök efter produkt/i);
    const input = inputs[0]; // We can test with the first one
    
    // Skriv text "te"
    // Eftersom useDebounce är mockad att vara direkt, kommer fetch triggas omedelbart
    fireEvent.change(input, { target: { value: "te" } });

    // Vi behöver bara vänta på att fetch anropas och UI uppdateras
    await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("/search/suggestions?q=te")
        );
    });

    // Kontrollera att resultatet "TestBrand" renderas
    // Suggestions might render near the input that has focus.
    await waitFor(() => {
        // The suggestion container might appear anywhere, so we just check for text
        expect(screen.getByText("TestBrand")).toBeInTheDocument();
    });
  });

  it("navigerar till sökresultat vid enter", async () => {
    render(
      <CartProvider>
        <Navbar />
      </CartProvider>
    );
  
    const inputs = screen.getAllByPlaceholderText(/Sök efter produkt/i);
    const input = inputs[0];
  
    // Hitta formuläret som hör till input-fältet
    const form = screen.getAllByTestId('search-form')[0];
  
    // Skriv in en sökterm
    fireEvent.change(input, { target: { value: "kaffe" } });
  
    // Skicka in formuläret
    fireEvent.submit(form);
  
    // Kontrollera att router.push anropades korrekt
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/?q=kaffe");
    });
  });
});