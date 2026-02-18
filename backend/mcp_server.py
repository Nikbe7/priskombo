from mcp.server.fastmcp import FastMCP
import os

# Tvinga Redis till localhost för MCP-servern (körs på host, inte i docker)
if os.getenv("REDIS_URL") is None or "redis:6379" in os.getenv("REDIS_URL"):
    os.environ["REDIS_URL"] = "redis://localhost:6379/0"

from typing import List, Dict, Any
from app.services.optimizer import calculate_best_basket
from app.db.session import SessionLocal
from app.models import Product
from pydantic import BaseModel

# Initiera MCP server
mcp = FastMCP("Priskombo Optimizer")

class CartItem(BaseModel):
    product_id: int
    quantity: int = 1

@mcp.tool()
def optimize_basket(items: List[Dict[str, int]]) -> List[Dict[str, Any]]:
    """
    Optimera en varukorg för att hitta billigaste totalpris inklusive frakt.
    
    Args:
        items: En lista med objekt som har 'product_id' och 'quantity'.
               Exempel: [{"product_id": 1, "quantity": 2}, {"product_id": 5, "quantity": 1}]
    """
    # Konvertera till objekt som liknar det SQLAlchemy förväntar sig (duck typing)
    class TempItem:
        def __init__(self, pid, qty):
            self.product_id = pid
            self.quantity = qty
            
    cart_items = [TempItem(i['product_id'], i['quantity']) for i in items]
    
    db = SessionLocal()
    try:
        results = calculate_best_basket(cart_items, db)
        return results
    finally:
        db.close()

@mcp.tool()
def get_product_info(product_id: int) -> str:
    """Hämta information om en produkts namn och slug baserat på ID."""
    db = SessionLocal()
    try:
        product = db.query(Product).filter(Product.id == product_id).first()
        if product:
            return f"ID: {product.id}, Name: {product.name}, Slug: {product.slug}"
        return "Product not found"
    finally:
        db.close()

if __name__ == "__main__":
    mcp.run()
