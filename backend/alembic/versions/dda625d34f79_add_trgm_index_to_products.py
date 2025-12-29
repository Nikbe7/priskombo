"""add_trgm_index_to_products

Revision ID: dda625d34f79
Revises: 025abcf60b9b
Create Date: 2025-12-29 14:55:13.482223

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dda625d34f79'
down_revision: Union[str, Sequence[str], None] = '025abcf60b9b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade():
    # 1. Aktivera tillägget pg_trgm (Trigram matching) i PostgreSQL
    # IF NOT EXISTS gör att det inte kraschar om det redan är påslaget
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # 2. Skapa ett GIN-index på kolumnen 'name'
    # 'gin_trgm_ops' är magin som gör att den kan hitta delar av ord snabbt
    op.create_index(
        'ix_products_name_trgm',
        'products',
        ['name'],
        postgresql_using='gin',
        postgresql_ops={'name': 'gin_trgm_ops'}
    )


def downgrade():
    # 1. Ta bort indexet om vi backar
    op.drop_index('ix_products_name_trgm', table_name='products')
    
    # (Valfritt) Vi brukar inte stänga av extensionen vid downgrade 
    # ifall andra tabeller använder den, men man kan göra:
    # op.execute("DROP EXTENSION IF EXISTS pg_trgm")
