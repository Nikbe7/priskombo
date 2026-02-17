import os
import requests
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from app.db.session import SessionLocal
from app.services.importer import import_csv_feed
from app.services.seeder import update_coming_soon_status
from app.core.logging import get_logger

logger = get_logger("scheduler")

# Här listar du dina framtida feeds
FEED_CONFIG = [
    {
        "store": "Apotea",
        "url": os.getenv("FEED_URL_APOTEA"), # Du lägger riktiga URLen i .env senare
    },
    {
        "store": "Lyko",
        "url": os.getenv("FEED_URL_LYKO"),
    },
    # Lägg till fler butiker här...
]

def download_and_import_job():
    """
    Detta jobb körs varje natt.
    1. Laddar ner CSV-filen till en temporär mapp.
    2. Kör din import-funktion.
    3. Raderar filen.
    """
    logger.info("⏰ SCHEDULER: Startar nattlig uppdatering...")
    db = SessionLocal()
    
    try:
        for feed in FEED_CONFIG:
            store_name = feed["store"]
            url = feed["url"]

            if not url:
                logger.warning(f"   ⚠️ Hoppar över {store_name} (Ingen URL konfigurerad)")
                continue

            logger.info(f"   ⬇️ Laddar ner feed för {store_name}...")
            
            # Spara filen temporärt i /tmp (Linux standard temp-mapp)
            tmp_file = f"/tmp/feed_{store_name}.csv"
            
            try:
                # Ladda ner filen (Streamar för att spara minne)
                with requests.get(url, stream=True) as r:
                    r.raise_for_status()
                    with open(tmp_file, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=8192):
                            f.write(chunk)
                
                # Kör din existerande import-funktion!
                import_csv_feed(tmp_file, store_name, db)
                
            except Exception as e:
                logger.error(f"❌ Misslyckades med {store_name}: {e}")
            finally:
                # Städa upp (ta bort filen)
                if os.path.exists(tmp_file):
                    os.remove(tmp_file)
                    logger.debug(f"🧹 Tog bort tempfil {tmp_file}")

        # Uppdatera status (Coming soon -> Active) efter importen
        logger.info("🔄 Uppdaterar 'Coming Soon' status...")
        update_coming_soon_status(db)
        logger.info("✅ SCHEDULER: Nattlig uppdatering klar.")

    finally:
        db.close()

# Skapa instansen av schedulern
scheduler = AsyncIOScheduler()

def start_scheduler():
    # Kör kl 03:00 varje natt
    scheduler.add_job(
        download_and_import_job,
        trigger=CronTrigger(hour=3, minute=0), # Kl 03:00
        id="nightly_import",
        replace_existing=True
    )
    
    scheduler.start()
    logger.info("🕒 Scheduler startad: Import schemalagd till 03:00.")