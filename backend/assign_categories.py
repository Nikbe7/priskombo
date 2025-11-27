import os
import json
import time
import re
import google.generativeai as genai
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import SessionLocal
from app.models import Product, Category

# Läs API-nyckel och modell från miljön
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_AI_MODEL = os.getenv("GOOGLE_AI_MODEL", "gemini-2.0-flash")

def assign_categories_optimized():
    db = SessionLocal()
    
    # 1. Förberedelser
    categories = db.query(Category.id, Category.name).all()
    if not categories:
        print("❌ Inga kategorier hittades.")
        return
    
    # Optimering: Hämta bara namn och ID, inte hela objekten
    cat_names = [c.name for c in categories]
    cat_map = {c.name: c.id for c in categories}
    
    total_products = db.query(Product.id).filter(Product.category_id == None).count()
    print(f"🕵️‍♂️ Hittade totalt {total_products} okategoriserade produkter.")
    
    if total_products == 0:
        print("✅ Allt är redan kategoriserat!")
        return

    # ---------------------------------------------------------
    # STEG 1: SQL-BASERAD NYCKELORDSSÖKNING (Algoritm: Set-based Update)
    # ---------------------------------------------------------
    print("\n⚡ STEG 1: Kör SQL-baserad massuppdatering...")
    
    keyword_hits = run_sql_keyword_categorization(db, cat_map)
    print(f"   -> Databasen uppdaterade {keyword_hits} produkter direkt.")

    # ---------------------------------------------------------
    # STEG 2: KÖR AI PÅ RESTEN (Batchad & JSON Schema)
    # ---------------------------------------------------------
    if GOOGLE_API_KEY:
        # Räkna om efter steg 1
        remaining_count = db.query(Product.id).filter(Product.category_id == None).count()
        
        if remaining_count > 0:
            print(f"\n🤖 STEG 2: Kör AI ({GOOGLE_AI_MODEL}) på återstående {remaining_count} produkter...")
            run_ai_categorization_bulk(db, cat_names, cat_map)
        else:
            print("✨ Inget kvar för AI att göra!")
    else:
        print("\n⚠️ Ingen API-nyckel. Hoppar över AI-steget.")

    db.close()
    print("\n✅ Kategorisering klar.")

def run_sql_keyword_categorization(db, cat_map):
    """
    Körs direkt i databasen via Regex. Extremt snabbt.
    """
    rules = {
        "Manligt": ["men", "homme", "man", "skägg", "beard", "herr"],
        "Parfym": ["parfum", "eau de", "toilette", "cologne", "doft", "edt", "edp"],
        "Smink": ["mascara", "foundation", "puder", "lipstick", "makeup", "concealer", "brow", "liner", "rouge", "nagellack"],
        "Hårvård": ["schampo", "shampoo", "balsam", "conditioner", "wax", "vax", "paste", "hår", "hair", "spray", "mousse"],
        "Ansiktsvård": ["face", "ansikte", "creme", "kräm", "cleanser", "rengöring", "serum", "eye", "ögon", "day", "night", "moisturizer"],
        "Kroppsvård": ["body", "kropp", "shower", "dusch", "tvål", "soap", "lotion", "deodorant", "deo", "scrub", "wash", "hand"],
        "Hälsa & Apotek": ["vitamin", "kosttillskott", "plåster", "värktablett", "mage", "tugg", "kapslar", "tablett", "omega"]
    }

    total_updated = 0

    for cat_name, keywords in rules.items():
        if cat_name not in cat_map:
            continue
            
        cat_id = cat_map[cat_name]
        
        patterns = []
        for k in keywords:
            safe_k = re.escape(k) 
            if len(k) <= 3:
                patterns.append(f"\\y{safe_k}\\y") 
            else:
                patterns.append(safe_k)
        
        regex_pattern = f"({'|'.join(patterns)})"
        
        sql = text("""
            UPDATE products 
            SET category_id = :cid 
            WHERE category_id IS NULL 
            AND name ~* :pattern
        """)
        
        result = db.execute(sql, {"cid": cat_id, "pattern": regex_pattern})
        count = result.rowcount
        
        if count > 0:
            total_updated += count
            db.commit()

    return total_updated

def run_ai_categorization_bulk(db, cat_names, cat_map):
    genai.configure(api_key=GOOGLE_API_KEY)
    
    # Optimering: Använd JSON Schema för garanterad struktur
    generation_config = {
        "response_mime_type": "application/json",
    }
    
    model = genai.GenerativeModel(
        GOOGLE_AI_MODEL,
        generation_config=generation_config
    )
    
    # Optimering: Större batch för Flash-modeller (sparar nätverksanrop)
    BATCH_SIZE = 100 
    backoff_time = 30
    
    while True:
        # Optimering: Hämta BARA id och namn (Lean loading)
        batch = db.query(Product.id, Product.name)\
            .filter(Product.category_id == None)\
            .limit(BATCH_SIZE)\
            .all()
        
        if not batch:
            break
            
        print(f"   🔄 AI Batch: Bearbetar {len(batch)} produkter...")
        
        # Bygg minimal prompt
        product_list_str = json.dumps([{"id": p.id, "name": p.name} for p in batch], ensure_ascii=False)
        categories_str = ", ".join(cat_names)
        
        prompt = f"""
        Uppgift: Kategorisera produkterna till EXAKT en av dessa kategorier: {categories_str}.
        
        Regler:
        1. "Men"/"Man" i namn -> Alltid 'Manligt'.
        2. Doft/Parfym -> 'Parfym'.
        
        Returnera en JSON-lista: [{{ "id": 123, "category": "Kategorinamn" }}]
        
        Data:
        {product_list_str}
        """

        try:
            response = model.generate_content(prompt)
            # Eftersom vi tvingar JSON behöver vi inte städa svaret lika aggressivt
            matches = json.loads(response.text)
            
            # Optimering: Bulk Update (istället för row-by-row)
            mappings = []
            for match in matches:
                pid = match.get("id")
                cname = match.get("category")
                
                if cname in cat_map:
                    mappings.append({
                        "id": pid,
                        "category_id": cat_map[cname]
                    })
            
            if mappings:
                db.bulk_update_mappings(Product, mappings)
                db.commit()
                print(f"      ✅ AI kategoriserade {len(mappings)} st (Bulk Update).")
            
            backoff_time = 30
            # Kort paus för att inte överbelasta, men kortare än förut tack vare större batch
            time.sleep(1) 

        except Exception as e:
            err_msg = str(e)
            print(f"      ❌ Fel: {e}")
            if "429" in err_msg or "Quota" in err_msg:
                print(f"      🛑 QUOTA EXCEEDED! Pausar {backoff_time}s...")
                time.sleep(backoff_time)
                backoff_time = min(backoff_time * 2, 300)
            else:
                print("      ⚠️ Hoppar över batch pga okänt fel (försöker nästa).")
                # I verkligheten kanske vi vill logga dessa IDn till en fil
                continue

if __name__ == "__main__":
    assign_categories_optimized()