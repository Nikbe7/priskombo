import click
import os
import sys
import subprocess
from dotenv import load_dotenv

# 1. NYTT: Importera loggning
from app.logging_config import setup_logging, get_logger

# Ladda miljövariabler
load_dotenv()

# 2. NYTT: Initiera loggning
setup_logging()
logger = get_logger("manage")

try:
    from app.database import SessionLocal, engine, Base
    from app.services.seeder import seed_categories, update_coming_soon_status
    from app.services.importer import import_csv_feed
    from app.services.dev_tools import generate_fake_data
    from app.services.categorizer import categorize_uncategorized_products
    from app.models import Product, ProductPrice, Store, Category # Behövs för att tabeller ska hittas
except ImportError as e:
    logger.error("❌ Kritiskt fel: Kunde inte importera backend-moduler.")
    logger.error(f"   Se till att du står i roten av projektet.")
    logger.error(f"   Fel: {e}")
    sys.exit(1)

# --- Helpers ---
def get_db():
    return SessionLocal()

def check_prod_environment():
    """Kollar om vi kör mot en skarp databas och varnar."""
    db_url = os.getenv("DATABASE_URL", "")
    if "supabase" in db_url and "localhost" not in db_url:
        logger.warning("⚠️  VARNING: DU ÄR UPPKOPPLAD MOT PRODUKTIONSDATABASEN (SUPABASE)! ⚠️")
        return True
    return False

@click.group()
def cli():
    """
    🛠️  PRISKOMBO MANAGER
    
    Ett verktyg för att hantera databas, importer och AI-kategorisering.
    """
    pass

# --- 1. DATABAS & RESET ---
@cli.command()
def init_db():
    """Skapar tabeller (om de inte finns)."""
    logger.info("🔨 Skapar databastabeller...")
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Klart!")

@cli.command()
@click.option('--force', is_flag=True, help="Hoppa över bekräftelse")
def reset_db(force):
    """
    🧨 NOLLSTÄLL DATABASEN (Tar bort ALLT och skapar nytt).
    """
    is_prod = check_prod_environment()
    
    if is_prod and not force:
        # Vi använder click.confirm här för att pausa exekveringen och kräva svar
        click.confirm("Är du HELT SÄKER på att du vill radera all data i PRODUKTION?", abort=True)
    elif not force:
        click.confirm("Detta raderar ALL data i databasen (lokalt). Är du säker?", abort=True)

    logger.warning("🗑️  Raderar alla tabeller...")
    Base.metadata.drop_all(bind=engine)
    
    logger.info("🔨 Skapar nya tabeller...")
    Base.metadata.create_all(bind=engine)
    
    # Stämpla databasen så att Alembic inte försöker skapa tabellerna igen
    logger.info("🏷️  Stämplar databasen för Alembic...")
    try:
        # Vi antar att alembic.ini ligger i 'backend/'-mappen
        if os.path.exists("backend/alembic.ini"):
            subprocess.run(["alembic", "stamp", "head"], cwd="backend", check=True)
        elif os.path.exists("alembic.ini"):
            subprocess.run(["alembic", "stamp", "head"], check=True)
        else:
            logger.warning("⚠️ Kunde inte hitta alembic.ini - kör 'alembic stamp head' manuellt.")
    except Exception as e:
        logger.error(f"⚠️ Kunde inte stämpla databasen: {e}")
    
    logger.info("🌱 Lägger in grundkategorier...")
    db = get_db()
    try:
        seed_categories(db)
    finally:
        db.close()

    logger.info("✨ Databasen är helt återställd och redo!")

@cli.command()
def seed():
    """Synkroniserar kategoriträdet."""
    db = get_db()
    try:
        seed_categories(db)
        update_coming_soon_status(db)
        logger.info("✅ Kategorier synkroniserade.")
    finally:
        db.close()

# --- 2. DATA & UTVECKLING ---
@cli.command()
@click.option('--amount', default=50, help='Antal produkter att skapa')
def fake_data(amount):
    """🧪 Skapar testdata (Produkter, Butiker, Priser)."""
    if check_prod_environment():
        click.confirm("Vill du verkligen skapa FAKE-data i produktion?", abort=True)

    db = get_db()
    try:
        generate_fake_data(db, amount)
        logger.info(f"✅ Skapade {amount} testprodukter.")

        update_coming_soon_status(db)
    finally:
        db.close()

@cli.command()
@click.argument('filename')
@click.option('--store', prompt='Butiksnamn', help='Namnet på butiken (t.ex. Apotea)')
def import_feed(filename, store):
    """📥 Importerar produkter från CSV-fil."""
    # Leta i backend-mappen om filen inte hittas direkt
    if not os.path.exists(filename):
        alt_path = os.path.join("backend", filename)
        if os.path.exists(alt_path):
            filename = alt_path
        else:
            logger.error(f"❌ Filen '{filename}' hittades inte.")
            return

    logger.info(f"🚀 Startar import för {store} från {filename}...")
    db = get_db()
    try:
        import_csv_feed(filename, store, db)
        logger.info("✅ Import klar.")

        update_coming_soon_status(db)
    finally:
        db.close()

# --- 3. AI & VERKTYG ---
@cli.command()
@click.option('--limit', default=None, type=int, help='Max antal produkter (lämna tomt för alla)')
def categorize(limit):
    """🤖 AI-kategoriserar produkter som saknar kategori."""
    db = get_db()
    try:
        logger.info("Startar kategorisering (Regex + AI)...")
        categorize_uncategorized_products(db, limit)
        update_coming_soon_status(db)
        logger.info("✅ Kategorisering färdig.")
    finally:
        db.close()

@cli.command()
def update_status():
    """🔄 Manuellt uppdatera 'Coming Soon' baserat på lagersaldo."""
    db = get_db()
    try:
        update_coming_soon_status(db)
    finally:
        db.close()

if __name__ == '__main__':
    cli()