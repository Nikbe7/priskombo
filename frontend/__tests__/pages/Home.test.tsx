import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import Home from "@/app/page";
import { CartProvider } from "@/context/CartContext";
import { toast } from "sonner";

// 1. Mocka sonner
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// 2. Mocka router och searchParams
const mockPush = jest.fn();
// Vi använder en variabel för att kunna ändra sökparametern i testerna
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
}));

// 3. Definiera "Happy Path" för fetch
const mockFetchHappyPath = (url: any) => {
  const urlString = url.toString();

  if (urlString.includes("/categories")) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve([
          { id: 1, name: "Hårvård", slug: "harvard", parent_id: null, coming_soon: false },
        ]),
    });
  }

  if (urlString.includes("/search")) {
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: 1,
            name: "Test Shampoo",
            slug: "test-shampoo",
            image_url: null,
            category: { name: "Hårvård", slug: "harvard" },
            prices: [{ price: 100, store: "Apotea", url: "#", base_shipping: 0 }],
          },
        ]),
    });
  }

  if (urlString.includes("/deals")) {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    });
  }

  return Promise.resolve({ ok: false, json: () => Promise.resolve([]) });
};

describe("Home Page", () => {
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.useFakeTimers();
    mockPush.mockClear();
    (toast.success as jest.Mock).mockClear();
    (toast.error as jest.Mock).mockClear();
    mockSearchParams = new URLSearchParams(); // Återställ params

    // @ts-ignore
    global.fetch = jest.fn(mockFetchHappyPath);
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    console.error = originalConsoleError;
  });

  it("visar sökresultat automatiskt när URL innehåller ?q=Shampoo", async () => {
    // Sätt sökparametern INNAN vi renderar
    mockSearchParams.set("q", "Shampoo");

    render(
      <CartProvider>
        <Home />
      </CartProvider>
    );

    // Eftersom query finns i URL ska sökning ske direkt (inuti useEffect)
    await waitFor(() => {
      // Kolla att fetch anropades med rätt URL
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/search?q=Shampoo")
      );
      
      // Kolla att resultatet visas
      expect(screen.getByText("Test Shampoo")).toBeInTheDocument();
      expect(screen.getByText(/Från 100 kr/i)).toBeInTheDocument();
    });
  });

  it("visar fel-toast vid nätverksfel (via URL parameter)", async () => {
    // Sätt sökparametern
    mockSearchParams.set("q", "Fail");

    // SKRIV ÖVER fetch BARA FÖR DETTA TEST
    // @ts-ignore
    global.fetch = jest.fn((url: any) => {
      const urlString = url.toString();
      
      if (urlString.includes("/categories") || urlString.includes("/deals")) {
          return mockFetchHappyPath(url);
      }
      
      if (urlString.includes("/search")) {
        return Promise.resolve({ ok: false });
      }
      
      return Promise.resolve({ ok: false });
    });

    render(
      <CartProvider>
        <Home />
      </CartProvider>
    );

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Kunde inte hämta"));
    });
  });

  it("visar success-toast när man lägger till en produkt från sökresultatet", async () => {
    mockSearchParams.set("q", "Shampoo");

    render(
      <CartProvider>
        <Home />
      </CartProvider>
    );

    // Vänta på resultatet
    await waitFor(() => {
      expect(screen.getByText("Test Shampoo")).toBeInTheDocument();
    });

    // Klicka på lägg till
    const addButton = screen.getByRole("button", { name: /\+ Lägg till/i });
    fireEvent.click(addButton);

    // Verifiera toast
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("lagts till"));
  });
});
