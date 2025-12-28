import os
import json
import time
import re
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models import Product, Category

# Läs API-nyckel och modell från miljön
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_AI_MODEL = os.getenv("GOOGLE_AI_MODEL", "gemini-2.0-flash")

def categorize_uncategorized_products(db: Session, limit: int = None):
    """
    Huvudfunktion som körs via manage.py.
    """
    # 1. Förberedelser
    categories = db.query(Category.id, Category.name).all()
    if not categories:
        print("❌ Inga kategorier hittades i databasen.")
        return
    
    cat_names = [c.name for c in categories]
    cat_map = {c.name: c.id for c in categories}
    
    total_uncat = db.query(Product.id).filter(Product.category_id == None).count()
    print(f"🕵️‍♂️ Hittade totalt {total_uncat} okategoriserade produkter.")
    
    if total_uncat == 0:
        print("✅ Allt är redan kategoriserat!")
        return

    # ---------------------------------------------------------
    # STEG 1: SQL-BASERAD NYCKELORDSSÖKNING (Gratis & Supersnabb)
    # ---------------------------------------------------------
    print("\n⚡ STEG 1: Kör SQL-baserad massuppdatering (Regex)...")
    keyword_hits = run_sql_keyword_categorization(db, cat_map)
    print(f"   -> Databasen uppdaterade {keyword_hits} produkter direkt.")

    # ---------------------------------------------------------
    # STEG 2: KÖR AI PÅ RESTEN
    # ---------------------------------------------------------
    if not GOOGLE_API_KEY:
        print("\n⚠️ Ingen GOOGLE_API_KEY. Hoppar över AI-steget.")
        return

    # Räkna om vad som är kvar
    remaining_count = db.query(Product.id).filter(Product.category_id == None).count()
    
    if remaining_count > 0:
        print(f"\n🤖 STEG 2: Kör AI ({GOOGLE_AI_MODEL}) på återstående produkter...")
        run_ai_categorization_bulk(db, cat_names, cat_map, limit_count=limit)
    else:
        print("✨ Inget kvar för AI att göra efter Regex-steget!")

    print("\n✅ Kategorisering klar.")

def run_sql_keyword_categorization(db: Session, cat_map: dict):
    """
    Körs direkt i databasen via Regex. Extremt snabbt.
    """
    # Här ligger alla dina smarta regler
    rules = {
        # --- SKÖNHET & HÄLSA ---
        "Manligt": ["men", "homme", "man", "skägg", "beard", "herr", "shaving", "rakhyvel", "rakskum", "aftershave"],
        "Parfym": ["parfum", "eau de", "toilette", "cologne", "doft", "edt", "edp", "perfume"],
        "Smink": ["mascara", "foundation", "puder", "lipstick", "makeup", "concealer", "brow", "liner", "rouge", "nagellack", "eyeshadow", "primer", "bronzer"],
        "Hårvård": ["schampo", "shampoo", "balsam", "conditioner", "wax", "vax", "paste", "hår", "hair", "spray", "mousse", "inpackning", "torrschampo"],
        "Ansiktsvård": ["face", "ansikte", "creme", "kräm", "cleanser", "rengöring", "serum", "eye", "ögon", "day", "night", "moisturizer", "toner", "mask"],
        "Kroppsvård": ["body", "kropp", "shower", "dusch", "tvål", "soap", "lotion", "deodorant", "deo", "scrub", "wash", "hand", "fotkräm"],
        "Apotek & Hälsa": ["vitamin", "kosttillskott", "plåster", "värktablett", "mage", "tugg", "kapslar", "tablett", "omega", "ipren", "alvedon", "resorb", "nasal", "allergi"],
        "Tandvård": ["tandkräm", "tandborste", "munskölj", "flux", "pepsodent", "oral-b", "tandtråd", "toothpaste"],
        "Solskydd": ["spf", "solkräm", "sun", "after sun", "solskydd", "tanning"],

        # --- KLÄDER & ACCESSOARER ---
        "Damkläder": ["dam", "woman", "women", "klänning", "kjol", "blus", "top", "bh", "trosor", "tights", "leggings", "bikini"],
        "Herrkläder": ["herr", "man", "men", "skjorta", "kostym", "kavaj", "slips", "kalsonger", "boxer", "jeans herr"],
        "Skor": ["sko", "sneaker", "känga", "stövel", "sandal", "pumps", "loafers", "boots", "tofflor", "klack"],
        "Väskor": ["väska", "bag", "ryggsäck", "handväska", "plånbok", "resväska", "totebag"],
        "Smycken": ["halsband", "ring", "örhänge", "armband", "guld", "silver", "diamant", "jewelry"],
        "Klockor": ["klocka", "watch", "ur", "armbandsur", "smartwatch"],
        "Underkläder": ["strumpor", "sockor", "underkläder", "kalsong", "trosa", "långkalsong"],
        "Glasögon": ["solglasögon", "bågar", "läsglasögon", "linser", "kontaktlinser", "ray-ban"],

        # --- HEM & HUSHÅLL ---
        "Städ & Tvätt": ["diskmedel", "tvättmedel", "sköljmedel", "yes", "via", "ariel", "rengöringsspray", "wettex", "mopp", "sopsäck", "finish"],
        "Kök & Matlagning": ["stekpanna", "kastrull", "kniv", "skål", "tallrik", "glas", "bestick", "mugg", "form", "ugnsform"],
        "Belysning": ["lampa", "glödlampa", "led", "ljusslinga", "taklampa", "spotlight"],
        "Inredning": ["kudde", "pläd", "ljuslykta", "vas", "matta", "poster", "ram", "doftljus"],
        "Badrum": ["handduk", "badlakan", "badrumsmatta", "tvålpump", "tandborstmugg"],
        "Sängkläder": ["påslakan", "örngott", "lakan", "sängöverkast", "täcke", "kudde säng"],

        # --- TEKNIK ---
        "Mobiler & Tillbehör": ["iphone", "samsung", "laddare", "skal", "fodral", "usb-c", "lightning", "screen protector", "skärmskydd"],
        "Ljud & Bild": ["hörlurar", "högtalare", "jbl", "sony", "bose", "tv", "hdmi", "soundbar", "airpods"],
        "Datorer & Surfplattor": ["laptop", "macbook", "ipad", "tablet", "dator", "mus", "tangentbord"],
        "Gaming": ["ps5", "xbox", "nintendo", "spel", "gaming", "handkontroll", "headset"],
        
        # --- BARN & FAMILJ ---
        "Blöjor & Vård": ["blöjor", "libero", "pampers", "våtservetter", "babyolja", "zinksalva", "napp", "nappflaska"],
        "Leksaker": ["lego", "docka", "pussel", "spel", "barbie", "fisher price", "gosedjur", "bilbana"],
        "Barnkläder & Skor": ["barnsko", "barnkläder", "body", "pyjamas barn", "overall", "regnkläder barn"],

        # --- SPORT ---
        "Kosttillskott": ["protein", "whey", "bcaa", "creatine", "gainer", "pwo", "bars", "vitamins"],
        "Träningskläder": ["sport-bh", "träningsbyxa", "nike", "adidas", "under armour", "gymshark", "löparskor"],
        "Utrustning": ["hantel", "gummiband", "yogamatta", "vattenflaska", "padelracket", "fotboll"],

        # --- HUSDJUR ---
        "Hund": ["hund", "dog", "valp", "koppel", "hundfoder", "royal canin", "pedigree", "hundgodis", "hundsäng"],
        "Katt": ["katt", "cat", "kattmat", "klösträd", "kattsand", "whiskas", "kattlåda"],
        
        # --- BYGG ---
        "Verktyg": ["hammare", "skruvdragare", "borr", "såg", "tång", "tumstock", "skiftnyckel"],
        "Måleri": ["färg", "pensel", "roller", "målarfärg", "lack", "tejp"],
        
        # --- FORDON ---
        "Bilvård": ["bilvax", "avfettning", "biltvätt", "schampo bil", "fälgrengöring", "spolarvätska", "doftgran"],
        
        # --- MAT ---
        "Godis & Snacks": ["choklad", "chips", "godis", "nötter", "marabou", "kex", "ostbågar"],
        "Dryck": ["coca-cola", "pepsi", "fanta", "ramlösa", "loka", "energidryck", "nocco", "celsius"],
        "Kaffe & Te": ["kaffe", "te", "espresso", "kapslar", "zoegas", "löfbergs", "lipton"],
        
        # --- BEGAGNAT ---
        "Begagnat Mode": ["second hand", "pre-owned", "vintage", "använd", "begagnad"],
        "Begagnad Elektronik": ["refurbished", "begagnad mobil", "begagnad dator"],
    }

    total_updated = 0

    for cat_name, keywords in rules.items():
        if cat_name not in cat_map:
            continue
            
        cat_id = cat_map[cat_name]
        patterns = []
        for k in keywords:
            safe_k = re.escape(k) 
            # Om ordet är kort (<=3 tecken), kräv word boundaries (\y i postgres regex)
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

def run_ai_categorization_bulk(db: Session, cat_names: list, cat_map: dict, limit_count: int = None):
    # NYTT: Initiera Client istället för configure()
    client = genai.Client(api_key=GOOGLE_API_KEY)
    
    # NYTT: Konfigurations-objekt för det nya SDK:t
    generate_config = types.GenerateContentConfig(
        response_mime_type="application/json"
    )
    
    BATCH_SIZE = 50 
    backoff_time = 30
    processed_count = 0
    
    while True:
        if limit_count and processed_count >= limit_count:
            break
            
        current_limit = BATCH_SIZE
        if limit_count:
            remaining = limit_count - processed_count
            if remaining < BATCH_SIZE:
                current_limit = remaining

        # Hämta BARA id och namn (Lean loading)
        batch = db.query(Product.id, Product.name)\
            .filter(Product.category_id == None)\
            .limit(current_limit)\
            .all()
        
        if not batch:
            break
            
        print(f"   🔄 AI Batch: Bearbetar {len(batch)} produkter...")
        
        product_list_str = json.dumps([{"id": p.id, "name": p.name} for p in batch], ensure_ascii=False)
        categories_str = ", ".join(cat_names)
        
        prompt = f"""
        Uppgift: Kategorisera dessa produkter till EXAKT en av dessa kategorier: {categories_str}.
        
        Regler:
        1. Försök vara specifik.
        2. Om helt omöjligt att avgöra, hoppa över produkten.
        
        Returnera en JSON-lista: [{{ "id": 123, "category": "Kategorinamn" }}]
        
        Produkter:
        {product_list_str}
        """

        try:
            # NYTT: Anrop med nya SDK-syntaxen
            response = client.models.generate_content(
                model=GOOGLE_AI_MODEL,
                contents=prompt,
                config=generate_config
            )
            
            matches = json.loads(response.text)
            
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
                print(f"      ✅ AI lyckades kategorisera {len(mappings)} av {len(batch)}.")
            
            processed_count += len(batch)
            time.sleep(1) 

        except Exception as e:
            err_msg = str(e)
            print(f"      ❌ Fel i batch: {e}")
            # Enkel backoff-logik för rate limits
            if "429" in err_msg or "Quota" in err_msg or "ResourceExhausted" in err_msg:
                print(f"      🛑 QUOTA EXCEEDED! Pausar {backoff_time}s...")
                time.sleep(backoff_time)
                backoff_time = min(backoff_time * 2, 60)
            else:
                print("      ⚠️ Hoppar över batch pga okänt fel.")
                break