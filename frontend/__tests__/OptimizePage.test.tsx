import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import OptimizePage from "@/app/optimize/page";
import { CartProvider } from "@/context/CartContext";

// Mocka useRouter
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mocka fetch (behövs för att sidan gör ett anrop vid mount)
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
) as jest.Mock;

describe("OptimizePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  it("väntar på initiering innan den redirectar (simulerar reload)", async () => {
    // 1. Sätt en "sparad" varukorg i localStorage så att Context hittar den
    const savedCart =JSON.stringify([
      {
        id: 1,
        name: "Sparad Produkt",
        prices: [{ price: 100, store: "X", url: "" }],
        quantity: 1,
      },
    ]);
    window.localStorage.setItem("priskombo_cart", savedCart);

    // 2. Rendera sidan
    render(
      <CartProvider>
        <OptimizePage />
      </CartProvider>
    );

    // 3. Just nu körs useEffect i Context. 'isInitialized' är false i några millisekunder.
    // Om din logik var fel, skulle router.push("/") ha anropats här eftersom basket är tom initialt.
    
    // Vi väntar på att "Sparad Produkt" ska dyka upp (vilket betyder att isInitialized blev true OCH vi hittade varan)
    await waitFor(() => {
        expect(screen.getByText("Sparad Produkt")).toBeInTheDocument();
    });

    // 4. Verifiera att vi INTE blev omdirigerade till startsidan
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("redirectar till start om korgen faktiskt är tom efter initiering", async () => {
    // Ingen data i localStorage denna gång
    
    render(
      <CartProvider>
        <OptimizePage />
      </CartProvider>
    );

    // Nu ska isInitialized bli true, basket förblir tom -> Redirect ska ske
    await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/");
    });
  });
});