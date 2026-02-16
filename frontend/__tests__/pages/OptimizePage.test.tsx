import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import OptimizePage from "@/app/optimize/page";
import { CartProvider } from "@/context/CartContext";

// Mocka navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => "/optimize",
}));

// Mocka toast
jest.mock("sonner", () => ({
  toast: { error: jest.fn() },
}));

describe("OptimizePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it("visar resultat när data hämtas korrekt", async () => {
    // 1. Mocka fetch-svar MED samlad leverans
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            type: "Samlad leverans",
            total_cost: 500,
            stores: ["TestStore"],
            details: [{
              store: "TestStore",
              shipping: 0,
              products_cost: 500,
              products: [{
                id: 1, name: "TestProdukt", slug: "prod", price: 500, url: "http://url"
              }]
            }]
          }
        ]),
      })
    ) as jest.Mock;

    // 2. Sätt varukorg
    window.localStorage.setItem("priskombo_cart", JSON.stringify([
      { id: 1, name: "TestProdukt", prices: [], quantity: 1 }
    ]));

    render(
      <CartProvider>
        <OptimizePage />
      </CartProvider>
    );

    // 3. Verifiera att texten laddas
    await waitFor(() => {
      expect(screen.getByText("TestProdukt")).toBeInTheDocument();
      expect(screen.getAllByText("TestStore").length).toBeGreaterThan(0);
      
      // Hitta H2 elementet som innehåller priset
      const priceHeading = screen.getByRole("heading", { level: 2, name: /500:-/i });
      expect(priceHeading).toBeInTheDocument();
    });

    // 4. Verifiera att varningsrutan INTE syns (eftersom vi har "Samlad leverans")
    expect(screen.queryByText(/Ingen enskild butik har alla varor/i)).not.toBeInTheDocument();
  });

  it("visar varningsruta om ingen samlad leverans hittas", async () => {
    // 1. Mocka fetch-svar UTAN samlad leverans (bara Smart Split)
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([
          {
            type: "Smart Split", // <--- Inte "Samlad leverans"
            total_cost: 600,
            stores: ["StoreA", "StoreB"],
            details: []
          }
        ]),
      })
    ) as jest.Mock;

    window.localStorage.setItem("priskombo_cart", JSON.stringify([
      { id: 1, name: "TestProdukt", prices: [], quantity: 1 }
    ]));

    render(
      <CartProvider>
        <OptimizePage />
      </CartProvider>
    );

    // 2. Verifiera att varningen dyker upp
    await waitFor(() => {
      expect(screen.getByText(/Ingen enskild butik har alla varor/i)).toBeInTheDocument();
    });
  });

  it("redirectar till start om korgen faktiskt är tom", async () => {
    // Ingen varukorg i localStorage
    render(
      <CartProvider>
        <OptimizePage />
      </CartProvider>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/");
    });
  });
});
