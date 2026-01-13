import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react"; // <--- LÄGG TILL 'within'
import "@testing-library/jest-dom";
import Home from "@/app/page";
import CartSidebar from "@/components/CartSidebar";
import { CartProvider } from "@/context/CartContext";
import { toast } from "sonner";

// 1. Mocka beroenden
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

// 2. Mocka fetch
// @ts-ignore
global.fetch = jest.fn((url: string) => {
  const urlString = url.toString();

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
          },
        ]),
    });
  }

  // För kategorier och sökning returnerar vi tomt
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  });
});

const TestApp = () => (
  <CartProvider>
    <Home />
    <CartSidebar />
  </CartProvider>
);

describe("Varukorgslogik", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (toast.success as jest.Mock).mockClear();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("grupperar samma produkt och ökar antal", async () => {
    render(<TestApp />);

    // 1. Vänta på att produkten laddas
    await waitFor(() =>
      expect(screen.getByText("Test Schampo")).toBeInTheDocument()
    );

    // 2. Hitta knappen (Ta den första om det finns flera)
    const addButtons = screen.getAllByRole("button", { name: "+" });
    const addButton = addButtons[0];

    // 3. Klicka två gånger
    fireEvent.click(addButton);
    fireEvent.click(addButton);

    // 4. Hitta Sidebaren (Desktop)
    // Eftersom det finns "Din Inköpslista" på flera ställen, letar vi efter <aside> först
    // CartSidebar använder <aside> elementet.
    // Vi måste vänta på att den dyker upp i DOM:en (även om den är hidden visuellt)
    // Vi letar efter desktop-sidebaren specifikt genom att leta efter elementet som har klassen "hidden lg:block"
    // Eller enklare: Vi vet att Desktop-sidebaren är den som har en <aside> tag.

    // Vi kan använda 'getAllByText' och ta den första, eller använda en mer specifik selector.
    // Låt oss använda texten men acceptera att det finns flera.
    const headings = await screen.findAllByText(/Din Inköpslista/i);
    expect(headings.length).toBeGreaterThan(0);

    // Nu vill vi verifiera innehållet.
    // Eftersom antalet '2' står på flera ställen (mobil och desktop), kollar vi bara att
    // NÅGOT element har texten "2" och ligger bredvid en knapp.

    // Det säkraste sättet utan test-ids är att kolla priset.
    // 2 * 100 = 200 kr.
    // Detta borde vara unikt nog eller åtminstone finnas.
    const priceElements = await screen.findAllByText("200 kr");
    expect(priceElements.length).toBeGreaterThan(0);
  });

  it("tar bort produkten när man minskar från 1 till 0", async () => {
    render(<TestApp />);

    await waitFor(() =>
      expect(screen.getByText("Test Schampo")).toBeInTheDocument()
    );

    // Hitta alla "+" knappar och klicka på den första
    const addButtons = screen.getAllByText("+");
    fireEvent.click(addButtons[0]);

    // Hitta alla "-" knappar
    await waitFor(() => {
      expect(screen.getAllByText("-").length).toBeGreaterThan(0);
    });

    const minusButtons = screen.getAllByText("-");
    // Klicka på den första vi hittar
    fireEvent.click(minusButtons[0]);

    // Verifiera att listan är tom
    await waitFor(() => {
      const emptyMessages = screen.getAllByText("Listan är tom");
      expect(emptyMessages.length).toBeGreaterThan(0);
    });
  });

  it("kan öka och minska antal i listan", async () => {
    render(<TestApp />);

    await waitFor(() =>
      expect(screen.getByText("Test Schampo")).toBeInTheDocument()
    );
    const addButtons = screen.getAllByRole("button", { name: "+" });
    fireEvent.click(addButtons[0]);

    // Vänta på att UI uppdateras och hitta knapparna via TEXT
    await waitFor(() =>
      expect(screen.getAllByText("+").length).toBeGreaterThan(0)
    );

    // Använd getAllByText för att hitta knapparna i sidebar
    const plusButtons = screen.getAllByText("+");
    const minusButtons = screen.getAllByText("-");

    // Klicka plus -> Borde bli 2
    // Ta sista knappen (oftast sidebar om den ligger sist i DOM) eller första
    fireEvent.click(plusButtons[0]);

    // Vänta på prisuppdatering: 200 kr
    await waitFor(() =>
      expect(screen.getAllByText("200 kr").length).toBeGreaterThan(0)
    );

    // Klicka plus -> Borde bli 3
    fireEvent.click(plusButtons[0]);
    await waitFor(() =>
      expect(screen.getAllByText("300 kr").length).toBeGreaterThan(0)
    );

    // Klicka minus -> Tillbaka till 2
    fireEvent.click(minusButtons[0]);
    await waitFor(() =>
      expect(screen.getAllByText("200 kr").length).toBeGreaterThan(0)
    );
  });
});
