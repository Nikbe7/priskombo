#!/bin/bash
set -e

# 1. Kör migreringar (så databasen alltid är uppdaterad)
echo "🔄 Kör databasmigreringar..."
alembic upgrade head

# 2. Starta servern
echo "🚀 Startar servern..."
# På Render sätts PORT automatiskt, lokalt använder vi 8000
PORT=${PORT:-8000}

# Använd Gunicorn med Uvicorn workers för produktion-prestanda
exec gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT