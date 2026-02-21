import re
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Category, Product
from app.core.logging import get_logger

logger = get_logger("seeder")

# Vi behåller listan för att bygga strukturen, men bryr oss inte om "active"-flaggan längre
CATEGORY_DATA = {
    "Skönhet & Hälsa": {
        "Hårvård": ["Schampo", "Balsam", "Hårstyling", "Hårinpackning", "Hårfärg", "Hårborstar & Kammar"],
        "Ansiktsvård": ["Ansiktsrengöring", "Ansiktskräm", "Ansiktsserum", "Ansiktsmask", "Ögonkräm", "Läppvård"],
        "Kroppsvård": ["Dusch & Bad", "Body Lotion & Olja", "Deodorant", "Handvård", "Fotvård", "Hårborttagning"],
        "Smink": ["Bas", "Ögon", "Läppar", "Naglar", "Sminkborstar & Verktyg"],
        "Parfym": ["Damparfym", "Herrparfym", "Unisexparfym", "Body Mist"],
        "Apotek & Hälsa": ["Kosttillskott", "Värk & Feber", "Förkylning", "Mage & Tarm", "Intim & Sex", "Första Hjälpen", "Allergi"],
        "Manligt": ["Skäggvård", "Rakning", "Hårvård Herr", "Hudvård Herr", "Kroppsvård Herr"],
        "Tandvård": ["Tandkräm", "Tandborstar", "Eltandborstar", "Muntvätt", "Tandtråd & Mellanrumsborstar"],
        "Solskydd": ["Solkräm Kropp", "Solkräm Ansikte", "After Sun", "Brun Utan Sol"]
    },
    "Kläder & Accessoarer": {
        "Damkläder": ["Överdelar Dam", "Byxor & Jeans Dam", "Klänningar & Kjolar", "Ytterplagg Dam", "Träningskläder Dam", "Underkläder Dam", "Sov- & Mysplagg Dam", "Badkläder Dam"],
        "Herrkläder": ["Överdelar Herr", "Byxor & Jeans Herr", "Kavajer & Kostymer", "Ytterplagg Herr", "Träningskläder Herr", "Underkläder Herr", "Sov- & Mysplagg Herr", "Badkläder Herr"],
        "Skor": ["Sneakers", "Kängor & Boots", "Lågskor", "Finskor & Klackar", "Sandaler & Tofflor", "Sportskor", "Gummistövlar"],
        "Väskor": ["Handväskor", "Ryggsäckar", "Axelremsväskor", "Resväskor", "Träningsväskor", "Plånböcker"],
        "Smycken": ["Halsband", "Armband", "Örhängen", "Ringar", "Smyckeskrin"],
        "Klockor": ["Armbandsur", "Smartwatches", "Klockarmband"],
        "Underkläder": ["Långkalsonger", "Strumpbyxor", "Strumpor"],
        "Glasögon": ["Solglasögon", "Läsglasögon", "Bågar", "Kontaktlinser"]
    },
    "Hem & Hushåll": {
        "Städ & Tvätt": ["Tvättmedel", "Sköljmedel", "Diskmedel", "Allrengöring", "Skurmedel", "Städredskap", "Avfallshantering"],
        "Kök & Matlagning": ["Kastruller & Stekpannor", "Köksknivar", "Bakning", "Köksredskap", "Matförvaring", "Dukning & Porslin", "Glas", "Bestick"],
        "Inredning": ["Prydnadskuddar", "Plädar & Filtar", "Mattor", "Vaser & Krukor", "Tavlor & Affischer", "Ljus & Ljuslyktor", "Speglar"],
        "Belysning": ["Taklampor", "Bordslampor", "Golvlampor", "Vägglampor", "Ljusslingor", "Utomhusbelysning", "Ljuskällor & Smarta Lampor"],
        "Badrum": ["Handdukar", "Badrumsmatta", "Duschdraperi", "Tvålpumpar", "Badrumstillbehör"],
        "Sängkläder": ["Påslakan", "Underlakan", "Örngott", "Överkast", "Kuddar", "Täcken", "Madrasskydd"],
        "Organisering": ["Korgar & Lådor", "Klädvård", "Hängare & Krokar", "Skoskåp & Förvaring"]
    },
    "Teknik & Datorer": {
        "Datorer & Surfplattor": ["Laptops", "Stationära Datorer", "Surfplattor", "Bildskärmar", "Tangentbord & Möss", "Datorkomponenter", "Lagring"],
        "Mobiler & Tillbehör": ["Mobiltelefoner", "Mobilskal & Fodral", "Skärmskydd", "Mobilladdare", "Powerbanks", "Hållare & Stativ"],
        "Ljud & Bild": ["TV-apparater", "Hörlurar", "Högtalare", "Soundbars", "Projektorer", "Kablage & Adaptrar", "Mediaspelare"],
        "Gaming": ["Spelkonsoler", "TV-spel", "Gamingdatorer", "Gamingheadset", "Gamingkontroller", "Gamingmöbler", "VR"],
        "Smart Hem": ["Smarta Högtalare", "Övervakning & Larm", "Smart Belysning", "Smarta Eluttag", "Klimat & Värme", "Röstassistenter"],
        "Foto & Video": ["Systemkameror", "Kompaktkameror", "Objektiv", "Stativ", "Kameraväskor", "Actionkameror", "Fototillbehör", "Fysiska Bilder & Ramar"],
        "Nätverk": ["Routers", "Nätverkskablar", "Switchar", "Nätverkskort", "Wi-Fi Förstärkare"]
    },
    "Barn & Familj": {
        "Blöjor & Vård": ["Blöjor", "Tvättlappar & Servetter", "Barnhudvård", "Nappar", "Nappflaskor", "Potta & Bad", "Amningsinlägg"],
        "Leksaker": ["LEGO", "Pussel & Spel", "Dockor", "Mjukisdjur", "Bygg & Lärande", "Fordon & Bilbanor", "Rollek & Pyssel", "Utelekar"],
        "Barnvagnar & Bilbarnstolar": ["Sittvagnar", "Liggvagnar", "Syskonvagnar", "Bilbarnstolar", "Bältesstolar", "Vagnstillbehör", "Babyskydd"],
        "Barnkläder & Skor": ["Barnskor", "Överdelar Barn", "Byxor & Jeans Barn", "Ytterplagg Barn", "Underkläder Barn", "Sovplagg Barn", "Barnstrumpor & Tights", "Regnkläder Barn", "Babykläder"],
        "Graviditet": ["Gravidkläder", "Gravidkuddar", "Amningskläder", "Bröstpumpar", "Stödstrumpor", "Kosttillskott Gravid"],
        "Barnrum": ["Barnmöbler", "Barnmattor", "Förvaring Barnrum", "Belysning Barnrum", "Sängkläder Barn", "Barninredning", "Babygym"]
    },
    "Sport & Fritid": {
        "Träningskläder": ["Tröjor & Linnen", "Byxor & Tights", "Sport-BH", "Träningsjackor", "Shorts", "Underställ", "Träningsstrumpor"],
        "Kosttillskott": ["Proteinpulver", "PWO", "Kreatin", "BCAA & EAA", "Vitaminer & Mineraler", "Energibars & Drycker", "Viktuppgång / Gainer"],
        "Utrustning": ["Matta & Yogablock", "Hantlar & Vikter", "Gummiband", "Foamrollers", "Träningsmaskiner", "Vattenflaskor", "Träningsväskor", "Sportskydd"],
        "Träningstillskott": {
            "Protein": ["Proteinpulver Whey", "Proteinpulver Vegan", "Gainer"],
            "Prestationshöjare": ["PWO", "Kreatin", "BCAA & EAA"],
            "Snacks & Dryck": ["Energidryck", "Proteinbars"]
        },
        "Cykel": {
            "Cyklar & Utrustning": ["Cyklar", "Cykelhjälmar", "Cykellås", "Cykelbelysning"]
        },
        "Träning & Utrustning": {
            "Gym & Fitness": ["Yogamattor", "Hantlar", "Träningshandskar"],
            "Friluftsliv": ["Tält", "Ryggsäckar Vandring", "Stormkök"]
        }
    },
    "Husdjur": {
        "Hund": {
            "Mat & Snacks": ["Hundmat Torrfoder", "Hundmat Våtfoder", "Hundgodis", "Tuggben"],
            "Tillbehör Hund": ["Halsband & Koppel", "Hundbäddar", "Hundleksaker"]
        },
        "Katt": {
            "Mat & Snacks": ["Kattmat Torrfoder", "Kattmat Våtfoder", "Kattgodis"],
            "Tillbehör Katt": ["Kattleksaker", "Klösträd", "Kattsand", "Kattlådor"]
        },
        "Smådjur & Fågel": {
            "Övriga husdjur": ["Foder Smådjur", "Fågelmat"]
        }
    },
    "Mat & Dryck": {
        "Dryck": {
            "Läsk & Vatten": ["Läskedryck", "Mineralvatten", "Saft"],
            "Kaffe & Te": ["Hela Kaffebönor", "Bryggkaffe", "Kaffekapslar", "Tepåsar", "Löste"]
        },
        "Skafferi": {
            "Snacks & Godis": ["Choklad & Praliner", "Chips & Bågar", "Lösgodis"],
            "Bakning & Kryddor": ["Kryddor", "Baktillbehör"]
        }
    }
}

def make_slug(text: str) -> str:
    text = text.lower()
    text = text.replace("å", "a").replace("ä", "a").replace("ö", "o")
    text = text.replace("&", "")
    text = re.sub(r'[^a-z0-9\s-]', '', text)
    text = re.sub(r'\s+', '-', text).strip("-")
    return text

def seed_recursive(db: Session, data, parent_id: int = None):
    """Rekursiv plöjning genom kategoriträdet (stödjer godtyckligt djup)."""
    if isinstance(data, dict):
        for name, children in data.items():
            slug = make_slug(name)
            node = check_or_create(db, name, slug, parent_id)
            seed_recursive(db, children, node.id)
    elif isinstance(data, list):
        for name in data:
            slug = make_slug(name)
            check_or_create(db, name, slug, parent_id)

def seed_categories(db: Session):
    """Skapar grundkategorier från det nästlade CATEGORY_DATA dictonary:t."""
    logger.info("🌱 Synkroniserar kategoriträd rekursivt...")
    seed_recursive(db, CATEGORY_DATA, None)
    db.commit()
    logger.info("✅ Kategoristruktur klar.")

def check_or_create(db: Session, name: str, slug: str, parent_id: int = None):
    category = db.query(Category).filter(Category.slug == slug).first()
    if not category:
        category = Category(
            name=name, 
            slug=slug, 
            parent_id=parent_id,
            coming_soon=True  # Default: True. Ändras dynamiskt senare.
        )
        db.add(category)
        db.flush()
        logger.info(f"   + Skapade: {name}")
    return category

def update_coming_soon_status(db: Session):
    """
    Kollar vilka kategorier som faktiskt har produkter och låser upp dem.
    """
    logger.info("🔄 Uppdaterar kategori-status baserat på lagersaldo...")
    
    # 1. Återställ allt till TRUE (pessimistisk start)
    db.query(Category).update({Category.coming_soon: True})
    
    # 2. Hitta ID på alla kategorier som har MINST EN produkt
    # SQL: SELECT DISTINCT category_id FROM products;
    active_category_ids = [
        r[0] for r in db.query(Product.category_id).distinct().all() 
        if r[0] is not None
    ]
    
    if not active_category_ids:
        logger.warning("   ⚠️ Inga produkter hittades. Alla kategorier är 'Coming Soon'.")
        db.commit()
        return

    # 3. Sätt dessa till active (coming_soon = False)
    db.query(Category).filter(Category.id.in_(active_category_ids)).update(
        {Category.coming_soon: False}, 
        synchronize_session=False
    )
    
    # 4. Uppdatera HUVUDKATEGORIER (Parents)
    # Vi måste traversera uppåt i trädet för att se till att även "farfar" blir aktiv i ett 3-nivås träd.
    current_level_ids = active_category_ids
    while current_level_ids:
        active_parents = db.query(Category.parent_id)\
            .filter(Category.id.in_(current_level_ids))\
            .distinct().all()
            
        active_parent_ids = [r[0] for r in active_parents if r[0] is not None]
        
        if not active_parent_ids:
            break
            
        db.query(Category).filter(Category.id.in_(active_parent_ids)).update(
            {Category.coming_soon: False},
            synchronize_session=False
        )
        current_level_ids = active_parent_ids

    db.commit()
    
    # Räkna hur många som är aktiva nu
    active_count = db.query(Category).filter(Category.coming_soon == False).count()
    logger.info(f"✅ Status uppdaterad! {active_count} kategorier är nu aktiva (har produkter).")