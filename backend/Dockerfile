# Vi använder Python 3.11.5
FROM python:3.11.5

# Sätt arbetskatalog inuti containern
WORKDIR /app

# Installera systemverktyg (behövs för psycopg2 och vissa python-paket)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Kopiera requirements först (för att cacha installationen)
COPY requirements.txt .

# Installera Python-paket
RUN pip install --no-cache-dir -r requirements.txt

# Kopiera resten av koden (inklusive manage.py och app-mappen)
COPY . .

# Gör start-scriptet körbart (vi skapar det i nästa steg)
RUN chmod +x start.sh

# Exponera port 8000
EXPOSE 8000

# Startkommando
CMD ["./start.sh"]