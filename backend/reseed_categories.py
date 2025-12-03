from app.database import SessionLocal
from app.models import Category

def reseed_structure():
    db = SessionLocal()
    print("🌳 Bygger om och aktiverar kategoriträdet...")

    # Vi sätter active: True på alla kategorier vi vill fylla med data
    structure = {
        "Skönhet & Hälsa": {
            "active": True,
            "subs": ["Hårvård", "Ansiktsvård", "Kroppsvård", "Smink", "Parfym", "Apotek & Hälsa", "Manligt", "Tandvård", "Solskydd"]
        },
        "Kläder & Accessoarer": {
            "active": True, # <-- Aktiverad
            "subs": ["Damkläder", "Herrkläder", "Skor", "Väskor", "Smycken", "Klockor", "Underkläder", "Glasögon"]
        },
        "Hem & Hushåll": {
            "active": True, # <-- Aktiverad
            "subs": ["Städ & Tvätt", "Kök & Matlagning", "Inredning", "Belysning", "Badrum", "Sängkläder", "Organisering"]
        },
        "Teknik & Datorer": {
            "active": True, # <-- Aktiverad
            "subs": ["Datorer & Surfplattor", "Mobiler & Tillbehör", "Ljud & Bild", "Gaming", "Smart Hem", "Foto & Video", "Nätverk"]
        },
        "Barn & Familj": {
            "active": True, # <-- Aktiverad
            "subs": ["Blöjor & Vård", "Leksaker", "Barnvagnar & Bilbarnstolar", "Barnkläder & Skor", "Graviditet", "Barnrum"]
        },
        "Sport & Fritid": {
            "active": True, # <-- Aktiverad
            "subs": ["Träningskläder", "Kosttillskott", "Utrustning", "Friluftsliv", "Cykling", "Vintersport", "Bollsport"]
        },
        "Bygg & Trädgård": {
            "active": True, # <-- Aktiverad
            "subs": ["Verktyg", "El & VVS", "Måleri", "Trädgårdsskötsel", "Byggmaterial", "Arbetskläder", "Säkerhet"]
        },
        "Husdjur": {
            "active": True, # <-- Aktiverad
            "subs": ["Hund", "Katt", "Smådjur", "Akvarium", "Häst", "Fågel"]
        },
        "Fordon & Tillbehör": {
            "active": True, # <-- Aktiverad
            "subs": ["Bilvård", "Reservdelar", "Däck & Fälg", "MC-utrustning", "Biltillbehör", "Olja & Vätskor"]
        },
        "Mat & Dryck": {
            "active": True, # <-- Aktiverad
            "subs": ["Skafferi", "Dryck", "Godis & Snacks", "Kaffe & Te", "Kryddor"]
        },
        "Kontor & Företag": {
            "active": False, # Låter denna vara inaktiv tills vidare
            "subs": ["Kontorsmaterial", "Skrivare & Bläck", "Emballage", "Kontorsmöbler", "Pennor & Block"]
        },
        "Begagnade produkter": {
            "active": True, # <-- Aktiverad
            "subs": ["Begagnat Mode", "Begagnad Elektronik", "Möbler & Inredning", "Samlarsaker", "Media & Böcker"]
        }
    }

    # Städa upp eventuella felaktiga rot-kategorier (om "Hälsa & Apotek" råkat bli en rot)
    wrong_root = db.query(Category).filter(Category.name == "Hälsa & Apotek").first()
    if wrong_root:
        wrong_root.name = "Apotek & Hälsa" # Rätta namnet
        db.commit()

    for root_name, data in structure.items():
        # A. Skapa/Hämta Huvudkategori
        root_cat = db.query(Category).filter(Category.name == root_name).first()
        
        if not root_cat:
            root_cat = Category(name=root_name, coming_soon=not data["active"])
            db.add(root_cat)
            db.commit()
            db.refresh(root_cat)
            print(f"   -> Skapade ROT: {root_name}")
        else:
            # Uppdatera status!
            root_cat.coming_soon = not data["active"]
            root_cat.parent_id = None 
            db.commit()
            # print(f"   -> Uppdaterade ROT: {root_name}")

        # B. Hantera Underkategorier
        for sub_name in data["subs"]:
            sub_cat = db.query(Category).filter(Category.name == sub_name).first()
            
            if not sub_cat:
                sub_cat = Category(name=sub_name, parent_id=root_cat.id)
                db.add(sub_cat)
                print(f"      -> Skapade SUB: {sub_name}")
            else:
                # Flytta till rätt förälder om den ligger fel
                if sub_cat.parent_id != root_cat.id:
                    sub_cat.parent_id = root_cat.id
                    db.add(sub_cat)
                    print(f"      -> Flyttade SUB: {sub_name} till {root_name}")
                
    db.commit()
    print("✅ Kategoriträdet är uppdaterat och aktiverat!")
    db.close()

if __name__ == "__main__":
    reseed_structure()