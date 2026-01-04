import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
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

// 2. Mocka router
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// 3. Definiera "Happy Path" för fetch (Standardbeteende som fungerar)
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
  // Spara original console.error för att kunna återställa
  const originalConsoleError = console.error;

  beforeEach(() => {
    jest.useFakeTimers();
    mockPush.mockClear();
    (toast.success as jest.Mock).mockClear();
    (toast.error as jest.Mock).mockClear();

    // VIKTIGT: Återställ fetch till "Happy Path" inför VARJE test
    // @ts-ignore
    global.fetch = jest.fn(mockFetchHappyPath);

    // Tysta ner console.error under testerna (så vi slipper se "Nätverksfel" i loggen)
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    console.error = originalConsoleError; // Återställ console.error
  });

  it("söker automatiskt efter debounce och visar resultat", async () => {
    render(
      <CartProvider>
        <Home />
      </CartProvider>
    );

    const input = screen.getByPlaceholderText(/Sök produkt/i);
    fireEvent.change(input, { target: { value: "Shampoo" } });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(screen.getByText("Test Shampoo")).toBeInTheDocument();
      expect(screen.getByText(/Från 100 kr/i)).toBeInTheDocument();
    });
  });

  it("visar fel-toast vid nätverksfel", async () => {
    // SKRIV ÖVER fetch BARA FÖR DETTA TEST
    // @ts-ignore
    global.fetch = jest.fn((url: any) => {
      const urlString = url.toString();
      
      // Låt categories/deals funka (så sidan inte kraschar direkt)
      if (urlString.includes("/categories") || urlString.includes("/deals")) {
         return mockFetchHappyPath(url);
      }

      // Men få /search att misslyckas
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

    const input = screen.getByPlaceholderText(/Sök produkt/i);
    fireEvent.change(input, { target: { value: "Fail" } });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Kunde inte hämta"));
    });
  });

  it("visar success-toast när man lägger till en produkt", async () => {
    // Här behöver vi inte göra något med fetch, för beforeEach har återställt den till Happy Path!
    
    render(
      <CartProvider>
        <Home />
      </CartProvider>
    );

    const input = screen.getByPlaceholderText(/Sök produkt/i);
    fireEvent.change(input, { target: { value: "Shampoo" } });

    act(() => {
      jest.advanceTimersByTime(400);
    });

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