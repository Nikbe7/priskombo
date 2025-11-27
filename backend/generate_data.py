import csv
import random

# Byggstenar för realistiska namn
brands = ["L'Oreal", "Nivea", "Gillette", "Head & Shoulders", "Dove", "Hugo Boss", "Dior", "Versace", "Maybelline", "Max Factor", "Flux", "Pepsodent"]
types = ["Schampo", "Balsam", "Vax", "Deodorant", "Parfym", "Ansiktskräm", "Mascara", "Foundation", "Tandkräm", "Munskölj"]
adjectives = ["Men", "Sensitive", "Pro", "Active", "Volume", "Repair", "Intense", "Fresh", "Classic", "Gold"]
sizes = ["50ml", "100ml", "250ml", "500ml", "750ml"]

def generate_mock_csv(filename="mock_products.csv", count=5000):
    print(f"🎲 Genererar {count} produkter till {filename}...")
    
    with open(filename, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file, delimiter=';')
        
        # Skriv header (samma format som din feed_engine förväntar sig)
        writer.writerow(['Produktnamn', 'EAN', 'Pris', 'Länk', 'Bildlänk'])
        
        generated_eans = set()

        for i in range(count):
            # Slumpa ihop ett namn
            brand = random.choice(brands)
            ptype = random.choice(types)
            adj = random.choice(adjectives)
            size = random.choice(sizes)
            
            name = f"{brand} {adj} {ptype} {size}"
            
            # Generera unikt EAN (13 siffror)
            ean = f"73{random.randint(10000000000, 99999999999)}"
            while ean in generated_eans:
                ean = f"73{random.randint(10000000000, 99999999999)}"
            generated_eans.add(ean)

            # Slumpa pris (mellan 29 kr och 899 kr)
            price = round(random.uniform(29.0, 899.0), 2)
            # Gör om till svenskt format "99,50" för att testa din parser
            price_str = f"{price:.2f}".replace('.', ',')

            # Fejk-länkar
            url = f"http://example.com/product/{ean}"
            # Vi använder en placeholder-bildtjänst så det ser snyggt ut
            image = f"https://placehold.co/400x400?text={brand}+{ptype}"

            writer.writerow([name, ean, price_str, url, image])
            
    print("✅ Klart! Filen är skapad.")

if __name__ == "__main__":
    generate_mock_csv()