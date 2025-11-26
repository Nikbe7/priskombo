import os
import json
import time
import google.generativeai as genai
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Product, Category

# Läs API-nyckel från miljön
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

def assign_categories_smart():
    db = SessionLocal()
    
    # 1. Förberedelser
    categories = db.query(Category).all()
    if not categories:
        print("❌ Inga kategorier hittades.")
        return
    
    cat_names = [c.name for c in categories]
    cat_map = {c.name: c.id for c in categories}
    
    # Hämta okategoriserade produkter
    products = db.query(Product).filter(Product.category_id == None).all()
    print(f"🕵️‍♂️ Hittade {len(products)} okategoriserade produkter.")
    
    if not products:
        print("✅ Allt är redan kategoriserat!")
        return

    # VÄLJ STRATEGI
    if GOOGLE_API_KEY:
        print("🤖 GOOGLE_API_KEY hittad! Kör med Gemini AI (Hög precision)...")
        run_ai_categorization(db, products, cat_names, cat_map)
    else:
        print("⚠️ Ingen GOOGLE_API_KEY hittad. Kör med Nyckelord (Lägre precision)...")
        print("   (Skaffa en nyckel på https://aistudio.google.com/app/apikey för bättre resultat)")
        run_keyword_categorization(db, products, cat_map)

    db.close()

def run_ai_categorization(db, products, cat_names, cat_map):
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel('gemini-2.0-flash') # Snabb och billig modell
    
    BATCH_SIZE = 20 # Vi tar 20 produkter åt gången
    
    for i in range(0, len(products), BATCH_SIZE):
        batch = products[i:i+BATCH_SIZE]
        print(f"🔄 Bearbetar batch {i+1} av {len(products)}...")
        
        # Bygg prompten
        product_list_str = "\n".join([f"- ID {p.id}: {p.name}" for p in batch])
        categories_str = ", ".join(cat_names)
        
        prompt = f"""
        Du är en expert på e-handelskategorisering för en svensk sajt.
        
        Tillgängliga kategorier: {categories_str}.
        
        Uppgift:
        Kategorisera följande produkter till EXAKT en av kategorierna ovan.
        - Om det är för män (t.ex. "Men", "Man", "Beard"), välj ALLTID 'Manligt' oavsett vad produkten är.
        - Om det är parfym/doft, välj 'Parfym'.
        - Om osäker, välj den mest logiska.
        
        Svara ENDAST med en JSON-lista på detta format:
        [
            {{"id": 123, "category": "Kategorinamn"}},
            ...
        ]

        Produkter:
        {product_list_str}
        """

        try:
            response = model.generate_content(prompt)
            # Städa svaret (ta bort eventuella markdown-tecken)
            clean_json = response.text.replace("```json", "").replace("```", "").strip()
            matches = json.loads(clean_json)
            
            updates = 0
            for match in matches:
                pid = match.get("id")
                cname = match.get("category")
                
                # Hitta produkten och uppdatera
                product = next((p for p in batch if p.id == pid), None)
                if product and cname in cat_map:
                    product.category_id = cat_map[cname]
                    print(f"  ✨ {product.name} -> {cname}")
                    updates += 1
            
            db.commit()
            # Snabb paus för att vara snäll mot API:et
            time.sleep(0.5)

        except Exception as e:
            print(f"❌ AI-fel på denna batch: {e}")
            # Vi fortsätter till nästa batch ändå

def run_keyword_categorization(db, products, cat_map):
    # Fallback-regler (samma som förut men lite trimmade)
    rules = {
        "Manligt": ["men", "homme", "man ", "skägg", "beard", "herr"],
        "Parfym": ["parfum", "eau de", "toilette", "cologne", "doft"],
        "Smink": ["mascara", "foundation", "puder", "lipstick", "makeup", "concealer", "brow", "liner"],
        "Hårvård": ["schampo", "shampoo", "balsam", "conditioner", "wax", "vax", "paste", "hår", "hair", "spray"],
        "Ansiktsvård": ["face", "ansikte", "creme", "kräm", "cleanser", "rengöring", "serum", "eye", "ögon", "day", "night"],
        "Kroppsvård": ["body", "kropp", "shower", "dusch", "tvål", "soap", "lotion", "deodorant", "deo", "scrub"],
        "Hälsa & Apotek": ["vitamin", "kosttillskott", "plåster", "värktablett", "mage", "tugg", "kapslar"]
    }

    count = 0
    for product in products:
        name_lower = product.name.lower()
        found = False
        
        for cat_name, keywords in rules.items():
            if any(k in name_lower for k in keywords):
                if cat_name in cat_map:
                    product.category_id = cat_map[cat_name]
                    count += 1
                    print(f"  📍 {product.name} -> {cat_name}")
                    found = True
                    break
        
        if not found:
            print(f"  ❓ Kunde inte gissa: {product.name}")

    db.commit()
    print(f"✅ Klar! Uppdaterade {count} produkter med nyckelord.")

if __name__ == "__main__":
    assign_categories_smart()