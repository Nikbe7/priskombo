import csv
import random

brands = ["L'Oreal", "Nivea", "Gillette", "Head & Shoulders", "Dove", "Hugo Boss", "Dior", "Versace", "Maybelline", "Max Factor"]
types = ["Schampo", "Balsam", "Vax", "Deodorant", "Parfym", "Ansiktskräm", "Mascara", "Foundation"]
adjectives = ["Men", "Sensitive", "Pro", "Active", "Volume", "Repair", "Intense", "Fresh", "Classic", "Gold"]
sizes = ["50ml", "100ml", "250ml", "500ml"]

def generate_mock_csv(filename="mock_products.csv", count=5000):
    print(f"🎲 Genererar {count} produkter med rabatter...")
    
    with open(filename, mode='w', newline='', encoding='utf-8') as file:
        writer = csv.writer(file, delimiter=';')
        # Uppdaterad header med "Ordinarie pris"
        writer.writerow(['Produktnamn', 'EAN', 'Pris', 'Ordinarie pris', 'Länk', 'Bildlänk'])
        
        generated_eans = set()

        for i in range(count):
            brand = random.choice(brands)
            ptype = random.choice(types)
            name = f"{brand} {random.choice(adjectives)} {ptype} {random.choice(sizes)}"
            
            ean = f"73{random.randint(10000000000, 99999999999)}"
            while ean in generated_eans:
                ean = f"73{random.randint(10000000000, 99999999999)}"
            generated_eans.add(ean)

            # Slumpa pris
            price = round(random.uniform(29.0, 899.0), 2)
            
            # 20% chans att varan är på rea (har ett högre ordinarie pris)
            regular_price_str = ""
            if random.random() < 0.2:
                # Ordinarie pris är 10-50% högre
                reg_price = price * random.uniform(1.1, 1.5)
                regular_price_str = f"{reg_price:.2f}".replace('.', ',')

            price_str = f"{price:.2f}".replace('.', ',')
            url = f"http://example.com/product/{ean}"
            image = f"https://placehold.co/400x400?text={brand}+{ptype}"

            writer.writerow([name, ean, price_str, regular_price_str, url, image])
            
    print("✅ Klart! Kör 'python run_import.py mock_products.csv Apotea' nu.")

if __name__ == "__main__":
    generate_mock_csv()