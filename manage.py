import sys
import subprocess
import os

# FÄRGER FÖR SNYGGARE LOGGAR
GREEN = "\033[92m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
RESET = "\033[0m"

def run_command(command, cwd=None):
    """Kör ett kommando i terminalen."""
    try:
        print(f"{CYAN}➡️  Kör: {command}{RESET}")
        # shell=True krävs för att kedja kommandon och hitta systemprogram
        subprocess.run(command, shell=True, check=True, cwd=cwd)
    except subprocess.CalledProcessError:
        print(f"\n{YELLOW}⚠️  Kommandot misslyckades eller avbröts.{RESET}")
        sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print_help()
        return

    action = sys.argv[1]

    # --- BACKEND COMMANDS ---
    if action == "run-back":
        print(f"{GREEN}🚀 Startar Backend (FastAPI)...{RESET}")
        run_command("uvicorn app.main:app --reload", cwd="backend")

    elif action == "test-back":
        print(f"{GREEN}🧪 Testar Backend...{RESET}")
        run_command("python -m pytest", cwd="backend")

    elif action == "install-back":
        print(f"{GREEN}📦 Installerar Python-paket...{RESET}")
        run_command("pip install -r requirements.txt", cwd="backend")
    
    elif action == "seed":
        print(f"{GREEN}🌱 Kör seed-scripts...{RESET}")
        run_command("python seed_categories.py", cwd="backend")
        run_command("python assign_categories.py", cwd="backend")

    # --- FRONTEND COMMANDS ---
    elif action == "run-front":
        print(f"{GREEN}🎨 Startar Frontend (Next.js)...{RESET}")
        run_command("npm run dev", cwd="frontend")

    elif action == "test-front":
        print(f"{GREEN}🧪 Testar Frontend...{RESET}")
        run_command("npm test", cwd="frontend")

    elif action == "install-front":
        print(f"{GREEN}📦 Installerar Node-paket...{RESET}")
        run_command("npm install", cwd="frontend")

    # --- PROJECT WIDE ---
    elif action == "test":
        print(f"{GREEN}🧪 Kör ALLA tester...{RESET}")
        print(f"\n{CYAN}--- BACKEND ---{RESET}")
        run_command("python -m pytest", cwd="backend")
        print(f"\n{CYAN}--- FRONTEND ---{RESET}")
        # CI=true gör att testerna körs en gång och avslutas, istället för "watch mode"
        run_command("set CI=true && npm test", cwd="frontend")
        print(f"\n{GREEN}✅ Alla tester godkända!{RESET}")

    elif action == "push":
        # Hanterar hela git-flödet säkert
        if len(sys.argv) < 3:
            print(f"{YELLOW}Glöm inte meddelandet! Användning: python manage.py push \"Ditt meddelande\"{RESET}")
            return
        
        message = sys.argv[2]
        print(f"{GREEN}🚀 Sparar och laddar upp till Dev...{RESET}")
        
        # 1. Kontrollera att vi är på dev
        # (Enkel check, kan göras mer avancerad)
        run_command("git checkout dev")
        
        # 2. Kör tester först (Safety first!)
        # Vi kör bara backend testerna här för snabbhet, men helst alla
        run_command("python -m pytest", cwd="backend")
        
        # 3. Git processen
        run_command("git add .")
        # Vi använder f-string för att få in meddelandet
        run_command(f'git commit -m "{message}"')
        run_command("git push origin dev")
        
        print(f"{GREEN}✅ Klart! Koden ligger nu på 'dev'.{RESET}")

    else:
        print(f"{YELLOW}Okänt kommando: {action}{RESET}")
        print_help()

def print_help():
    print(f"""
{GREEN}🛠️  PRISKOMBO COMMAND CENTER{RESET}
Användning: python manage.py [kommando]

{CYAN}Backend:{RESET}
  run-back      Startar servern
  test-back     Kör pytest
  install-back  Installera dependencies
  seed          Kör kategorisering och seeding

{CYAN}Frontend:{RESET}
  run-front     Startar hemsidan
  test-front    Kör npm test
  install-front Installera dependencies

{CYAN}Projekt:{RESET}
  test          Kör BÅDE backend och frontend tester
  push "msg"    Kör tester -> git add -> commit -> push till dev
    """)

if __name__ == "__main__":
    main()