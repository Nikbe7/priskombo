from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from app.logging_config import setup_logging, get_logger

# Databas och Modeller
from app.database import get_db
from app.models import Product, ProductPrice, Store

# Services
from app.services.optimizer import calculate_best_basket
from app.services.scheduler import start_scheduler, scheduler, download_and_import_job

# Routers
from api.v1.endpoints import categories, products, deals

# Initiera loggning direkt
setup_logging()
logger = get_logger("main") # <--- Skapa en logger för main-filen

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Servern startar upp...") # <--- Använd loggern
    start_scheduler()
    yield
    logger.info("🛑 Servern stänger ner...")
    try:
        scheduler.shutdown()
    except Exception as e:
        logger.warning(f"Kunde inte stänga scheduler snyggt: {e}")

# --- LIFESPAN (Hanterar uppstart och nedstängning) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Starta Schedulern (Cron-jobbet) när servern startar
    start_scheduler()
    yield
    # 2. Stäng av Schedulern när servern stängs ner
    try:
        scheduler.shutdown()
    except Exception:
        pass

# Initiera appen med lifespan
app = FastAPI(
    title="Priskombo API",
    version="1.0",
    lifespan=lifespan
)

# --- CORS SETUP ---
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
    allow_origin_regex="https://priskombo.*\.vercel\.app", # Tillåter Vercel previews
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ROUTERS ---
app.include_router(categories.router, prefix="/categories", tags=["categories"])
app.include_router(products.router, prefix="/products", tags=["products"])
app.include_router(deals.router, prefix="/deals", tags=["deals"])

# --- DATAMODELLER (Schema) ---
class BasketRequest(BaseModel):
    product_ids: List[int]

# --- ENDPOINTS ---

@app.get("/")
def read_root():
    return {"message": "API is running"}

@app.api_route("/health", methods=["GET", "HEAD"])
def health_check():
    return {"status": "ok", "message": "I am awake!"}

@app.get("/search")
def search(q: str, db: Session = Depends(get_db)):
    if not q or len(q) < 2:
        return []

    # Sökning med joins för att få med priser och butiker
    query_result = db.query(Product, ProductPrice, Store)\
        .join(ProductPrice, Product.id == ProductPrice.product_id)\
        .join(Store, ProductPrice.store_id == Store.id)\
        .filter(Product.name.ilike(f"%{q}%"))\
        .limit(200)\
        .all()

    results_map = {}
    
    for product, price, store in query_result:
        if product.id not in results_map:
            results_map[product.id] = {
                "id": product.id,
                "name": product.name,
                "ean": product.ean,
                "image_url": product.image_url,
                "prices": []
            }
        
        results_map[product.id]["prices"].append({
            "store": store.name,
            "price": price.price,
            "regular_price": price.regular_price,
            "discount_percent": price.discount_percent,
            "url": price.url
        })
    
    return list(results_map.values())

@app.post("/optimize")
def optimize_basket(request: BasketRequest, db: Session = Depends(get_db)):
    """
    Tar emot en lista med produkt-IDn och returnerar billigaste butiken.
    """
    if not request.product_ids:
        raise HTTPException(status_code=400, detail="Varukorgen är tom")
    
    best_options = calculate_best_basket(request.product_ids, db)
    return best_options

# --- TEST-ENDPOINT FÖR SCHEDULER ---
@app.post("/force-import")
def force_import(background_tasks: BackgroundTasks):
    """
    Manuell trigger för att testa import-jobbet utan att vänta till kl 03:00.
    Körs asynkront i bakgrunden.
    """
    background_tasks.add_task(download_and_import_job)
    return {"message": "Importjobb startat i bakgrunden! Kolla loggarna."}