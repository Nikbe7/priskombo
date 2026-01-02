"""add_slug_to_products

Revision ID: 1e074146f125
Revises: dda625d34f79
Create Date: 2026-01-02 03:37:48.799263

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1e074146f125'
down_revision: Union[str, Sequence[str], None] = 'dda625d34f79'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Lägg till kolumnen 'slug' i tabellen 'products'
    op.add_column('products', sa.Column('slug', sa.String(), nullable=True))
    
    # 2. Skapa ett unikt index på kolumnen (för snabb sökning och unika värden)
    op.create_index(op.f('ix_products_slug'), 'products', ['slug'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    # Om vi backar migreringen tar vi bort indexet och kolumnen
    op.drop_index(op.f('ix_products_slug'), table_name='products')
    op.drop_column('products', 'slug')