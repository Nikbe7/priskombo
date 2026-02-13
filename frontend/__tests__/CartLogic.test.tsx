import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom";
import Home from "@/app/page";
import CartSidebar from "@/components/CartSidebar";
import { CartProvider } from "@/context/CartContext";

// 1. Mocka beroenden
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("next/navigation", () => ({ 
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/",
  useSearchParams: () => ({ get: () => "" }),
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
            prices: [{ price: 100, store: "Apotea", url: "#" }]
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

// Helper för att hitta produktkortets knapp
const findProductCardButton = async (name: string) => {
    const productHeading = await screen.findByRole('heading', { name });
    // Traversera upp till en container som unikt innehåller både produktinfo och knapp
    const productCardContainer = productHeading.closest('.p-4'); 
    if (!productCardContainer) {
        throw new Error(`Kunde inte hitta container för produkt: ${name}`);
    }
    return within(productCardContainer).getByRole('button');
}

describe("Varukorgslogik", () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(window.localStorage, "setItem");
  });

  it("lägger till produkt i korgen och öppnar sidebar", async () => {
    render(<TestApp />);
    
    // Vänta på att produkten laddas
    await screen.findByText("Test Schampo");

    // Hitta och klicka på "Köp"-knappen
    const addButton = await findProductCardButton("Test Schampo");
    fireEvent.click(addButton);

    // Verifiera att korgen öppnas och produkten syns inuti den
    await waitFor(() => {
      const sidebar = screen.getByLabelText("Varukorg"); // Använd aria-label för robusthet
      expect(within(sidebar).getByText("Din Inköpslista")).toBeInTheDocument();
      expect(within(sidebar).getByText("Test Schampo")).toBeInTheDocument();
    });

    // Säkerställ att texten finns på både kort och i sidebar
    expect(screen.getAllByText("Test Schampo").length).toBeGreaterThan(1);
  });

  it("tar bort produkten när man minskar från 1 till 0", async () => {
    render(<TestApp />);

    // Lägg till produkten
    const addButton = await findProductCardButton("Test Schampo");
    fireEvent.click(addButton);

    // Vänta på att sidebaren innehåller produkten
    const sidebar = screen.getByLabelText("Varukorg");
    await within(sidebar).findByText("Test Schampo");

    // Hitta minus-knappen INUTI sidebarens produkt-rad
    const productInCart = within(sidebar).getByText("Test Schampo");
    const itemContainer = productInCart.closest('div[class*="flex gap"]');
    if (!itemContainer) throw new Error("Hittade inte produktens container i korgen");

    const minusButton = within(itemContainer).getByRole('button', { name: "-" });
    fireEvent.click(minusButton);

    // Verifiera att listan nu är tom
    await waitFor(() => {
      expect(within(sidebar).getByText(/Listan är tom/i)).toBeInTheDocument();
    });
  });

  it("kan öka och minska antal i listan", async () => {
    render(<TestApp />);

    // Lägg till produkten
    const addButton = await findProductCardButton("Test Schampo");
    fireEvent.click(addButton);

    // Vänta på sidebaren och hitta knapparna för produkten
    const sidebar = screen.getByLabelText("Varukorg");
    const productInCart = await within(sidebar).findByText("Test Schampo");
    const itemContainer = productInCart.closest('div[class*="flex gap"]');
    if (!itemContainer) throw new Error("Hittade inte produktens container i korgen");

    const plusButton = within(itemContainer).getByRole('button', { name: "+" });
    const minusButton = within(itemContainer).getByRole('button', { name: "-" });

    // Öka till 2
    fireEvent.click(plusButton);
    await waitFor(() => {
      expect(within(itemContainer).getByText("2")).toBeInTheDocument();
      expect(within(itemContainer).getByText(/200\s*kr/i)).toBeInTheDocument();
    });

    // Öka till 3
    fireEvent.click(plusButton);
    await waitFor(() => {
        expect(within(itemContainer).getByText("3")).toBeInTheDocument();
        expect(within(itemContainer).getByText(/300\s*kr/i)).toBeInTheDocument();
    });
    
    // Minska till 2
    fireEvent.click(minusButton);
    await waitFor(() => {
        expect(within(itemContainer).getByText("2")).toBeInTheDocument();
        expect(within(itemContainer).getByText(/200\s*kr/i)).toBeInTheDocument();
    });
  });

  it("sparar varukorgen till localStorage och laddar den vid omstart", async () => {
    const { unmount } = render(<TestApp />);

    // 1. Lägg till produkten
    const addButton = await findProductCardButton("Test Schampo");
    fireEvent.click(addButton);

    // 2. Verifiera att den lades till och att setItem anropades
    await waitFor(() => {
        expect(window.localStorage.setItem).toHaveBeenCalledWith(
            "priskombo_cart",
            expect.stringContaining("Test Schampo")
        );
    });
    
    // 3. Simulera "Refresh"
    unmount();
    render(<TestApp />);

    // 4. Verifiera att korgen minns produkten direkt från localStorage
    const sidebar = screen.getByLabelText("Varukorg");
    await waitFor(() => {
        // Hitta den specifika raden för produkten
        const productInCart = within(sidebar).getByText("Test Schampo");
        const itemContainer = productInCart.closest('div[class*="flex gap"]');
        if (!itemContainer) throw new Error("Hittade inte produktens container i korgen");

        // Verifiera antalet *inom* den raden
        expect(within(itemContainer).getByText("1")).toBeInTheDocument();
    });
  });
});