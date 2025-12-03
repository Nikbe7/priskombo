import csv
import random
import os
from app.database import SessionLocal
from app.services.feed_engine import process_feed_bulk

# Utökade datasets för att täcka alla kategorier
datasets = {
    "Skönhet": {
        "brands": ["L'Oreal", "Nivea", "Gillette", "Head & Shoulders", "Dove", "Hugo Boss", "Dior", "Versace"],
        "products": ["Schampo", "Balsam", "Deodorant", "Parfym", "Ansiktskräm", "Mascara", "Rakhyvel"],
        "adjs": ["Men", "Sensitive", "Pro", "Active", "Volume", "Repair", "Fresh", "Gold"]
    },
    "Apotek": {
        "brands": ["Alvedon", "Ipren", "Flux", "Oral-B", "Pepsodent", "ACO", "Berocca"],
        "products": ["Värktablett", "Munskölj", "Tandkräm", "Vitaminer", "Plåster", "Nässpray", "Handkräm"],
        "adjs": ["Forte", "Original", "Mint", "Kids", "Daily", "Max", "Gel"]
    },
    "Kläder": {
        "brands": ["H&M", "Zara", "Levi's", "Nike", "Adidas", "Gant", "Ralph Lauren"],
        "products": ["Klänning", "Skjorta", "Jeans", "T-shirt", "Jacka", "Tröja", "Kalsonger"],
        "adjs": ["Slim Fit", "Oversized", "Vintage", "Classic", "Black", "Blue", "Summer"]
    },
    "Teknik": {
        "brands": ["Samsung", "Apple", "Sony", "JBL", "Logitech", "Asus", "Philips", "Nintendo"],
        "products": ["Hörlurar", "Laddare", "Gaming Mus", "Tangentbord", "Skärmskydd", "USB-kabel", "Powerbank", "Laptop"],
        "adjs": ["Wireless", "Pro", "Ultra", "Fast", "Gaming", "Bluetooth", "Noise Cancelling"]
    },
    "Hem": {
        "brands": ["Yes", "Via", "IKEA", "Philips", "Tefal", "Fiskars", "Bosch", "Electrolux"],
        "products": ["Diskmedel", "Tvättmedel", "LED Lampa", "Stekpanna", "Kniv", "Städmopp", "Doftljus", "Kastrull"],
        "adjs": ["Original", "Eco", "Power", "Soft", "Smart", "Classic", "Large"]
    },
    "Husdjur": {
        "brands": ["Royal Canin", "Pedigree", "Whiskas", "Dogman", "Purina", "Orijen"],
        "products": ["Hundfoder", "Kattmat", "Hundleksak", "Katthalsband", "Bajspåsar", "Tuggben", "Kattsand"],
        "adjs": ["Adult", "Junior", "Chicken", "Beef", "Sensitive", "Large Breed", "Grain Free"]
    },
    "Sport": {
        "brands": ["Nike", "Adidas", "Gymshark", "Star Nutrition", "Better Bodies", "Puma"],
        "products": ["Protein", "BCAA", "Träningstights", "Sport-BH", "Vattenflaska", "Yogamatta", "Löparskor"],
        "adjs": ["Whey", "Isolate", "Performance", "Pro", "Black", "Seamless", "Dry-Fit"]
    },
    "Bygg": {
        "brands": ["Bosch", "Makita", "DeWalt", "Bahco", "Beckers", "Jotun"],
        "products": ["Skruvdragare", "Hammare", "Såg", "Målarfärg", "Tumstock", "Arbetsbyxa", "Pensel"],
        "adjs": ["Pro", "18V", "Heavy Duty", "Vit", "Matt", "Ergo", "Set"]
    },
    "Fordon": {
        "brands": ["Turtle Wax", "Sonax", "Castrol", "Mobil1", "Bosch", "Meguiars"],
        "products": ["Bilvax", "Avfettning", "Spolarvätska", "Motorolja", "Torkarblad", "Fälgrengöring"],
        "adjs": ["Super", "Extreme", "5W-30", "Nano", "Shine", "Winter"]
    },
    "Mat": {
        "brands": ["Marabou", "Coca-Cola", "Pepsi", "Löfbergs", "Zoegas", "OLW", "Estrella"],
        "products": ["Chokladkaka", "Läsk", "Kaffe", "Chips", "Nötter", "Ostbågar"],
        "adjs": ["Mjölkchoklad", "Zero", "Dark Roast", "Saltad", "Grill", "Original"]
    }
}

def generate_mock_data(count=6000):
    print(f"🎲 Genererar {count} unika bas-produkter över {len(datasets)} kategorier...")
    
    products = []
    generated_eans = set()

    # 1. Skapa master-lista med produkter
    for i in range(count):
        category_type = random.choice(list(datasets.keys()))
        data = datasets[category_type]
        
        brand = random.choice(data["brands"])
        prod = random.choice(data["products"])
        adj = random.choice(data["adjs"])
        
        name = f"{brand} {adj} {prod}"
        if random.random() > 0.5: name += f" {random.choice(['500ml', '2-pack', '1kg', 'XL', '50ml'])}"
        
        ean = f"73{random.randint(10000000000, 99999999999)}"
        while ean in generated_eans:
            ean = f"73{random.randint(10000000000, 99999999999)}"
        generated_eans.add(ean)

        base_price = round(random.uniform(29.0, 2499.0), 2)
        
        # Placeholder bild med text
        image = f"https://placehold.co/400x400/e2e8f0/1e293b?text={prod}"
        
        products.append({
            "name": name,
            "ean": ean,
            "base_price": base_price,
            "image": image
        })

    # 2. Skapa feeds och kör import direkt
    stores = ["Apotea", "Lyko", "Nordicfeel", "Kicks", "Clas Ohlson", "Komplett", "Sportamore"]
    
    # Starta databas-session en gång
    db = SessionLocal()
    
    try:
        for store in stores:
            filename = f"feed_{store.lower().replace(' ', '')}.csv"
            print(f"\n📝 Skapar feed för {store} -> {filename}...")
            
            with open(filename, mode='w', newline='', encoding='utf-8') as file:
                writer = csv.writer(file, delimiter=';')
                writer.writerow(['Produktnamn', 'EAN', 'Pris', 'Ordinarie pris', 'Länk', 'Bildlänk'])
                
                for p in products:
                    # 70% chans att butiken har produkten
                    if random.random() > 0.7:
                        continue
                    
                    price_factor = random.uniform(0.85, 1.15)
                    price = round(p["base_price"] * price_factor, 2)
                    
                    regular_price_str = ""
                    if random.random() < 0.2: 
                        reg_price = price * random.uniform(1.2, 1.5)
                        regular_price_str = f"{reg_price:.2f}".replace('.', ',')

                    price_str = f"{price:.2f}".replace('.', ',')
                    url = f"http://example.com/product/{p['ean']}?store={store}"

                    writer.writerow([p["name"], p["ean"], price_str, regular_price_str, url, p["image"]])
            
            # --- HÄR KÖR VI IMPORTEN DIREKT ---
            print(f"🚀 Kör automatisk import för {store}...")
            process_feed_bulk(filename, store, db)
            print(f"✅ {store} importerad och klar.")
            
            # Städa upp (ta bort filen för att spara plats, valfritt)
            # os.remove(filename) 

    except Exception as e:
        print(f"❌ Ett fel uppstod: {e}")
    finally:
        db.close()

    print("\n🎉 Allt klart! Databasen är nu fylld med nya produkter och priser.")

if __name__ == "__main__":
    generate_mock_data()