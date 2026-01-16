import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import Home from "@/app/page";
import CartSidebar from "@/components/CartSidebar";
import { CartProvider } from "@/context/CartContext";
import { toast } from "sonner";

// 1. Mocka beroenden
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("next/navigation", () => ({ 
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/",
}));

// 2. Mocka fetch
// @ts-ignore
global.fetch = jest.fn((url: string) => {
  const urlString = url.toString();

  if (urlString.includes("/categories")) {
      return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]) // Tom lista är ok
      });
  }

  // Returnera vår testprodukt för DEALS
  if (urlString.includes("/deals")) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: 1,
            name: "Test Schampo",
            slug: "test-schampo",
            image_url: "img.jpg",
            price: 100,
            regular_price: 120,
            store: "Apotea",
            discount_percent: 20,
            url: "#",
            prices: [{ price: 100, store: "Apotea", url: "#" }] // Viktigt: prices array!
          },
        ]),
    });
  }
  return Promise.resolve({ json: () => Promise.resolve([]) });
});

// Helper component
const TestApp = () => (
  <CartProvider>
    <CartSidebar />
    <Home />
  </CartProvider>
);

describe("Varukorgslogik", () => {
  beforeEach(() => {
    // Rensa
    window.localStorage.clear();
    jest.clearAllMocks();

    // SPIONERA på setItem (för testet som kollar om det sparas)
    jest.spyOn(window.localStorage, "setItem");
  });

  it("lägger till produkt i korgen och öppnar sidebar", async () => {
    render(<TestApp />);
    
    // Vänta på att produkten laddas
    const productTitle = await screen.findByText("Test Schampo");
    expect(productTitle).toBeInTheDocument();

    // Hitta "Köp"-knappen (ikonen)
    const addButtons = screen.getAllByRole("button", { name: "+" });
    fireEvent.click(addButtons[0]);

    // Verifiera att korgen öppnas och produkten syns
    await waitFor(() => {
      expect(screen.getByText("Din Inköpslista")).toBeInTheDocument();
      // Använd getAllByText eftersom texten finns både på "kortet" och i "korgen"
      expect(screen.getAllByText("Test Schampo").length).toBeGreaterThan(1);
    });
  });

  it("tar bort produkten när man minskar från 1 till 0", async () => {
    render(<TestApp />);

    await waitFor(() => expect(screen.getByText("Test Schampo")).toBeInTheDocument());
    
    // Lägg till
    const addButtons = screen.getAllByRole("button", { name: "+" });
    fireEvent.click(addButtons[0]);

    // Hitta minus-knappen i sidebaren
    await waitFor(() => {
        expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    });
    
    const minusButtons = screen.getAllByText("-");
    // Klicka på den första vi hittar (troligen den i sidebaren som precis öppnades)
    fireEvent.click(minusButtons[0]);

    // Verifiera att listan är tom
    await waitFor(() => {
      // Använd regex för att vara mer flexibel
      const emptyMessages = screen.getAllByText(/Listan är tom/i);
      expect(emptyMessages.length).toBeGreaterThan(0);
    });
  });

  it("kan öka och minska antal i listan", async () => {
    render(<TestApp />);

    await waitFor(() => expect(screen.getByText("Test Schampo")).toBeInTheDocument());
    const addButtons = screen.getAllByRole("button", { name: "+" });
    fireEvent.click(addButtons[0]);

    // Vänta på att UI uppdateras i sidebaren
    await waitFor(() => expect(screen.getAllByText("+").length).toBeGreaterThan(0));

    // Hitta knapparna i sidebaren (de ligger sist i DOMen oftast)
    const allPlus = screen.getAllByText("+");
    const allMinus = screen.getAllByText("-");
    const sidebarPlus = allPlus[allPlus.length - 1];
    const sidebarMinus = allMinus[allMinus.length - 1];

    // Klicka plus -> Borde bli 2
    fireEvent.click(sidebarPlus);
    
    // Vänta på att "2" syns (antalet)
    // Vi kollar efter span-elementet som visar antalet
    await waitFor(() => {
        // Det finns en span som visar antalet. Vi letar efter den.
        // Eftersom det kan finnas flera "2" på sidan, kollar vi att någon av dem är i sidebar
        expect(screen.getAllByText("2").length).toBeGreaterThan(0);
        // Alternativt: Kolla priset med regex
        expect(screen.getAllByText(/200\s*kr/i).length).toBeGreaterThan(0);
    });

    // Klicka plus -> Borde bli 3
    fireEvent.click(sidebarPlus);
    await waitFor(() => expect(screen.getAllByText(/300\s*kr/i).length).toBeGreaterThan(0));

    // Klicka minus -> Tillbaka till 2
    fireEvent.click(sidebarMinus);
    await waitFor(() => expect(screen.getAllByText(/200\s*kr/i).length).toBeGreaterThan(0));
  });

  it("sparar varukorgen till localStorage och laddar den vid omstart", async () => {
    const { unmount } = render(<TestApp />);

    // 1. Vänta på att produkten laddas och lägg till den
    await waitFor(() => expect(screen.getByText("Test Schampo")).toBeInTheDocument());
    const addButtons = screen.getAllByRole("button", { name: "+" });
    fireEvent.click(addButtons[0]);

    // 2. Verifiera att den lades till (vänta på att korgen uppdateras)
    await waitFor(() => expect(screen.getAllByText("Test Schampo").length).toBeGreaterThan(1));

    // 3. Verifiera att setItem anropades
    await waitFor(() => {
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
        "priskombo_cart",
        expect.stringContaining("Test Schampo")
        );
    });

    // 4. Simulera "Refresh"
    unmount();
    
    // Rendera på nytt (localStorage mocken behåller datan)
    render(<TestApp />);

    // 5. Verifiera att korgen minns produkten direkt
    await waitFor(() => {
        const badges = screen.getAllByText("1"); 
        expect(badges.length).toBeGreaterThan(0);
    });
  });
});