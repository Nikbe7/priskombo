from typing import Optional
from pydantic import BaseModel, ConfigDict

class CategoryBase(BaseModel):
    name: str
    slug: str
    parent_id: Optional[int] = None
    coming_soon: bool = False

class CategoryLink(BaseModel):
    name: str
    slug: str
    parent: Optional['CategoryLink'] = None # Rekursiv för att hitta huvudkategorin

    model_config = ConfigDict(from_attributes=True)

class Category(CategoryBase):
    id: int
    
    model_config = ConfigDict(from_attributes=True)

# Löser den rekursiva referensen
CategoryLink.model_rebuild()
