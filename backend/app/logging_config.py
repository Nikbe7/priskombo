import logging
import sys

# Konfigurera loggformatet
# Exempel output: 2025-01-02 10:00:00 [INFO] priskombo.importer: Startar import...
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"

def setup_logging():
    """Konfigurerar grundläggande loggning för applikationen."""
    logging.basicConfig(
        level=logging.INFO,  # Fångar INFO, WARNING, ERROR (men inte DEBUG)
        format=LOG_FORMAT,
        handlers=[
            logging.StreamHandler(sys.stdout) # Skriv till standard output (för Docker)
        ]
    )

def get_logger(name: str):
    """Hjälpfunktion för att hämta en logger med rätt namn."""
    return logging.getLogger(f"priskombo.{name}")