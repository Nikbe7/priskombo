from app.database import SessionLocal
from app.models import Category, Product
from sqlalchemy import func

def cleanup():
    db = SessionLocal()
    print("🧹 Städar kategorier...")

    # 1. Hitta "Skönhet & Hälsa" (Den korrekta föräldern)
    parent = db.query(Category).filter(Category.name == "Skönhet & Hälsa").first()
    if parent:
        # Flytta eventuella lösryckta "Apotek & Hälsa" till rätt förälder
        target = db.query(Category).filter(
            Category.name == "Apotek & Hälsa", 
            Category.parent_id == None
        ).first()

        if target:
            print(f"   -> Hittade lösryckt kategori: {target.name} (ID: {target.id})")
            target.parent_id = parent.id
            target.coming_soon = False
            db.commit()
            print(f"   ✅ Flyttade '{target.name}' till underkategori av '{parent.name}'")
            
        # Flytta andra kända underkategorier om de ligger löst
        subs = ["Hårvård", "Ansiktsvård", "Kroppsvård", "Smink", "Parfym", "Manligt", "Tandvård", "Solskydd"]
        for sub_name in subs:
            cat = db.query(Category).filter(Category.name == sub_name, Category.parent_id == None).first()
            if cat:
                cat.parent_id = parent.id
                print(f"   -> Flyttade lösryckt '{cat.name}' till '{parent.name}'")
        db.commit()

    # --- 2. SLÅ IHOP DUBBLETTER ---
    # Detta löser problemet med dubbla "Apotek & Hälsa" underkategorier
    print("\n🔍 Letar efter och slår ihop dubbletter...")
    all_cats = db.query(Category).order_by(Category.id).all()
    seen = {} # key: (namn, parent_id) -> value: category_object

    for cat in all_cats:
        key = (cat.name, cat.parent_id)
        if key in seen:
            # Detta är en dubblett!
            master = seen[key]
            print(f"   -> Dubblett hittad: '{cat.name}' (ID: {cat.id}). Slår ihop med ID {master.id}...")
            
            # Flytta alla produkter från dubbletten till mastern
            products = db.query(Product).filter(Product.category_id == cat.id).all()
            for p in products:
                p.category_id = master.id
            
            # Flytta ev. underkategorier
            children = db.query(Category).filter(Category.parent_id == cat.id).all()
            for child in children:
                child.parent_id = master.id
                
            # Ta bort dubbletten
            db.delete(cat)
            print(f"      Flyttade {len(products)} produkter och raderade dubbletten.")
        else:
            seen[key] = cat
    
    db.commit()
    print("   ✅ Dubbletter rensade.")

    # --- 3. UPPDATERA 'SNART'-STATUS ---
    # Sätt coming_soon = True om kategorin är tom
    print("\n🔄 Uppdaterar status (SNART) baserat på innehåll...")
    
    # Steg A: Uppdatera alla baserat på om de har produkter direkt
    all_cats = db.query(Category).all()
    for cat in all_cats:
        prod_count = db.query(func.count(Product.id)).filter(Product.category_id == cat.id).scalar()
        # Om den har produkter är den aktiv, annars preliminärt inaktiv
        cat.coming_soon = (prod_count == 0)
    db.commit()

    # Steg B: Huvudkategorier ska vara aktiva om de har NÅGON aktiv underkategori
    # (Även om huvudkategorin själv inte har produkter)
    parents = db.query(Category).filter(Category.parent_id == None).all()
    for parent in parents:
        has_active_child = db.query(Category).filter(
            Category.parent_id == parent.id, 
            Category.coming_soon == False
        ).count() > 0
        
        if has_active_child:
            parent.coming_soon = False
            
    db.commit()
    print("   ✅ Status uppdaterad. Tomma kategorier är nu markerade 'SNART'.")

    print("\n🏁 Städning klar.")
    db.close()

if __name__ == "__main__":
    cleanup()