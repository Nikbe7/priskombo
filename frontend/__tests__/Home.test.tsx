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

// Mocka router
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mocka fetch
// @ts-ignore
global.fetch = jest.fn((url: string) => {
  const urlString = url.toString();

  if (urlString.includes("/categories")) {
    return Promise.resolve({
      json: () =>
        Promise.resolve([
          {
            id: 1,
            name: "Hårvård",
            slug: "harvard",
            parent_id: null,
            coming_soon: false,
          },
        ]),
    });
  }

  if (urlString.includes("/search")) {
    return Promise.resolve({
      json: () =>
        Promise.resolve([
          {
            id: 1,
            name: "Test Shampoo",
            slug: "test-shampoo", // Nytt
            image_url: null,
            category: { name: "Hårvård", slug: "harvard" }, // Nytt
            prices: [
              { price: 100, store: "Apotea", url: "#", base_shipping: 0 },
            ],
          },
        ]),
    });
  }

  return Promise.resolve({ json: () => Promise.resolve([]) });
});

describe("Home Page", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPush.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("söker automatiskt efter debounce", async () => {
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

  it("visar skeletons under sökning", async () => {
    // 1. Använd "fake timers" för att kontrollera debounce
    jest.useFakeTimers();

    // 2. Mocka en fetch som tar tid på sig (t.ex. 500ms)
    // @ts-ignore
    global.fetch = jest.fn((url) => {
      // Vi returnerar en Promise
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true, // Bra att ha med om din kod kollar response.ok
            json: () =>
              Promise.resolve([{ id: 1, name: "Sökresultat", prices: [] }]),
          } as any); 
        }, 1000); // Svarar efter 1 sekund
      });
    });

    render(
      <CartProvider>
        <Home />
      </CartProvider>
    );

    const input = screen.getByPlaceholderText(/Sök produkt/i);

    // 3. Skriv något för att trigga sökning
    fireEvent.change(input, { target: { value: "Kaffe" } });

    // 4. Snabbspola fram debounce-tiden (400ms) så att sökningen startar
    // Men INTE hela vägen till 1000ms (då svaret kommer)
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // 5. Nu borde fetch ha anropats och vi väntar på svar -> Skeletons ska synas!
    
    // Om du använder en enkel div med animate-pulse (utan test-id):
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);

    // 6. Rensa timers
    jest.useRealTimers();
  });
});
