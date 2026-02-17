from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from app.core.logging import setup_logging, get_logger

# Services
from app.services.scheduler import start_scheduler, scheduler, download_and_import_job

# Router (Samlingsfilen vi skapade)
from app.api.v1.api import api_router

# 1. Initiera loggning direkt
setup_logging()
logger = get_logger("main")

# 2. LIFESPAN (Hanterar uppstart och nedstängning)
@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- START ---
    logger.info("🚀 Servern startar upp...")
    try:
        start_scheduler()
    except Exception as e:
        logger.error(f"Kunde inte starta scheduler: {e}")
    
    yield  # Här körs applikationen
    
    # --- STOPP ---
    logger.info("🛑 Servern stänger ner...")
    try:
        if scheduler.running:
            scheduler.shutdown()
    except Exception as e:
        logger.warning(f"Kunde inte stänga scheduler snyggt: {e}")

# 3. Initiera appen
app = FastAPI(
    title="Priskombo API",
    version="1.0",
    lifespan=lifespan
)

# 4. CORS SETUP
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://priskombo.vercel.app",
    "https://priskombo.se",
    "https://www.priskombo.se",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://priskombo.*\.vercel\.app", # Regex för Vercel previews
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 5. INKLUDERA ROUTERS
app.include_router(api_router, prefix="/api/v1") 

# 6. ENKLA STATUS-ENDPOINTS
@app.get("/")
def read_root():
    return {"message": "Priskombo API is running 🚀"}

@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    return {"status": "ok", "message": "I am awake!"}

# 7. UTILITY ENDPOINTS (För dev/test)
@app.post("/force-import")
def force_import(background_tasks: BackgroundTasks):
    """
    Manuell trigger för att testa import-jobbet utan att vänta till kl 03:00.
    Körs asynkront i bakgrunden.
    """
    background_tasks.add_task(download_and_import_job)
    return {"message": "Importjobb startat i bakgrunden! Kolla loggarna."}