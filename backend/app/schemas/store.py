from typing import Optional
from pydantic import BaseModel, ConfigDict

class StoreBase(BaseModel):
    name: str

class Store(StoreBase):
    id: int
    base_shipping: float = 0
    free_shipping_limit: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)
