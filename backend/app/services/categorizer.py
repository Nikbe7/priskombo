import os
import json
import time
import re
from google import genai
from google.genai import types
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models import Product, Category
from app.core.logging import get_logger

logger = get_logger("categorizer")

# Läs API-nyckel och modell från miljön
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
GOOGLE_AI_MODEL = os.getenv("GOOGLE_AI_MODEL", "gemini-2.0-flash")

def categorize_uncategorized_products(db: Session, limit: int = None):
    """
    Huvudfunktion som körs via manage.py.
    """
    # 1. Förberedelser
    categories = db.query(Category.id, Category.name, Category.parent_id).all()
    if not categories:
        logger.error("❌ Inga kategorier hittades i databasen.")
        return
    
    parent_ids = {c.parent_id for c in categories if c.parent_id is not None}
    leaf_categories = [c for c in categories if c.id not in parent_ids]
    
    cat_names = [c.name for c in leaf_categories]
    cat_map = {c.name: c.id for c in leaf_categories}
    
    total_uncat = db.query(Product.id).filter(Product.category_id == None).count()
    logger.info(f"🕵️‍♂️ Hittade totalt {total_uncat} okategoriserade produkter.")
    
    if total_uncat == 0:
        logger.info("✅ Allt är redan kategoriserat!")
        return

    # ---------------------------------------------------------
    # STEG 1: SQL-BASERAD NYCKELORDSSÖKNING (Gratis & Supersnabb)
    # ---------------------------------------------------------
    logger.info("⚡ STEG 1: Kör SQL-baserad massuppdatering (Regex)...")
    keyword_hits = run_sql_keyword_categorization(db, cat_map)
    logger.info(f"   -> Databasen uppdaterade {keyword_hits} produkter direkt.")

    # ---------------------------------------------------------
    # STEG 2: KÖR AI PÅ RESTEN
    # ---------------------------------------------------------
    if not GOOGLE_API_KEY:
        logger.warning("⚠️ Ingen GOOGLE_API_KEY. Hoppar över AI-steget.")
        return

    # Räkna om vad som är kvar
    remaining_count = db.query(Product.id).filter(Product.category_id == None).count()
    
    if remaining_count > 0:
        logger.info(f"🤖 STEG 2: Kör AI ({GOOGLE_AI_MODEL}) på återstående produkter...")
        run_ai_categorization_bulk(db, cat_names, cat_map, limit_count=limit)
    else:
        logger.info("✨ Inget kvar för AI att göra efter Regex-steget!")

    logger.info("✅ Kategorisering klar.")

def run_sql_keyword_categorization(db: Session, cat_map: dict):
    """
    Körs direkt i databasen via Regex. Extremt snabbt.
    """
    # Här ligger alla dina smarta regler
    rules = {
        # --- SKÖNHET & HÄLSA ---
        "Volymschampo": ["volymschampo", "volume shampoo", "thickening"],
        "Mjällschampo": ["mjällschampo", "dandruff", "head & shoulders"],
        "Färgbewarande Schampo": ["färgbevarande", "color protect", "color shampoo"],
        "Balsamspray": ["balsamspray", "leave-in", "leave in conditioner"],
        
        "Hårvax": ["hårvax", "wax", "paste", "pomade", "clay"],
        "Hårspray": ["hårspray", "hair spray", "hair spray"],
        "Hårmousse": ["hårmousse", "mousse", "volymmousse"],
        
        "Permanent Hårfärg": ["hårfärg", "permanent color", "hair dye"],
        "Toning": ["toning", "color mask", "color bomb", "färgbomb"],
        
        "Hårinpackning": ["hårinpackning", "hair mask", "treatment", "kur"],
        "Hårborstar & Kammar": ["hårborste", "borste", "hairbrush", "kam", "tangle teezer"],
        
        "Ansiktsrengöring": ["cleanser", "ansiktstvätt", "rengöring", "micellar", "face wash"],
        "Ansiktsvatten": ["ansiktsvatten", "toner", "face mist"],
        
        "Ansiktskräm": ["ansiktskräm", "face cream", "moisturizer", "day cream", "night cream", "dagkräm", "nattkräm"],
        "Ansiktsserum": ["serum", "ansiktsserum", "vitamin c serum", "retinol"],
        "Ögonkräm": ["ögonkräm", "eye cream", "eye serum"],
        
        "Ansiktsmask": ["ansiktsmask", "face mask", "sheet mask", "clay mask"],
        "Läppvård": ["läppbalsam", "lip balm", "lypsyl", "carmex"],
        "Aknevård": ["akne", "acne", "blemish", "spot treatment", "finnar"],
        
        "Foundation": ["foundation", "cc cream", "bb cream", "täckande"],
        "Puder": ["puder", "powder", "setting powder"],
        "Concealer": ["concealer", "cover up"],
        "Primer": ["primer", "face primer"],
        "Rouge": ["rouge", "blush"],
        "Bronzer": ["bronzer", "solpuder"],
        
        "Mascara": ["mascara", "lash mascara"],
        "Eyeliner": ["eyeliner", "kajal", "liquid liner"],
        "Ögonskugga": ["ögonskugga", "eyeshadow", "palett"],
        "Ögonbryn": ["ögonbryn", "brow", "ögonbrynspenna", "brow gel"],
        
        "Läppstift": ["läppstift", "lipstick", "liquid lipstick"],
        "Läppglans": ["läppglans", "lip gloss", "plumper"],
        "Läppenna": ["läppenna", "lip liner"],
        
        "Nagellack": ["nagellack", "nail polish", "base coat", "top coat"],
        
        "Duschkräm": ["duschkräm", "shower gel", "shower oil", "body wash", "duschgel"],
        "Badsalt": ["badsalt", "badskum", "bath bomb", "bath salt"],
        "Tvål": ["tvål", "soap", "handtvål", "hand soap"],
        
        "Body Lotion": ["lotion", "body lotion", "hudlotion", "body butter"],
        "Kroppsolja": ["kroppsolja", "body oil", "massageolja"],
        
        "Deodorant Dam": ["deodorant dam", "deo dam", "lady speed stick"],
        "Deodorant Herr": ["deodorant herr", "deo herr", "axe", "old spice"],
        "Unisex Deo": ["deodorant", "deo", "antiperspirant", "roll-on"],
        
        "Solkräm Kropp": ["solkräm", "sunscreen", "solskydd", "spf", "sun lotion"],
        "After Sun": ["after sun", "aftersun", "aloe vera gel"],
        
        "Eau de Parfum Dam": ["eau de parfum dam", "edp dam"],
        "Eau de Toilette Dam": ["eau de toilette dam", "edt dam", "damparfym", "parfym dam", "perfume"],
        
        "Eau de Parfum Herr": ["eau de parfum herr", "edp herr"],
        "Eau de Toilette Herr": ["eau de toilette herr", "edt herr", "herrparfym", "parfym herr"],
        "Cologne": ["cologne", "eau de cologne", "edc"],
        
        "Vitaminer & Mineraler": ["vitamin", "multivitamin", "b-vitamin", "c-vitamin", "d-vitamin"],
        "Omega & Fettsyror": ["omega-3", "omega 3", "fiskolja", "fish oil"],
        "Magnesium": ["magnesium"],
        "Järn": ["järn", "iron supplement", "järntabletter"],
        
        "Värk & Feber": ["värktablett", "ipren", "alvedon", "panodil", "paracetamol", "ibuprofen"],
        "Förkylning": ["hostmedicin", "förkylning", "echinaforce", "kan jang"],
        "Nässpray": ["nässpray", "nasal", "otrivin", "nezeril"],
        "Halstabletter": ["halstabletter", "bafucin", "strepsils", "zYX", "halstab"],
        
        "Rakhyvel & Rakblad": ["rakhyvel", "rakblad", "gillette", "mach3", "venus", "razor"],
        "Raklödder": ["raklödder", "rakskum", "shaving gel", "shaving cream", "rakgel"],
        "Skäggolja": ["skäggolja", "beard oil", "skäggbalm", "skägg"],
        
        "Tandkräm": ["tandkräm", "toothpaste", "pepsodent", "sensodyne", "colgate"],
        "Tandborstar": ["tandborste", "toothbrush", "jordan", "manuell tandborste"],
        "Eltandborstar": ["eltandborste", "oral-b", "philips sonicare", "eltandborsthuvud"],
        "Muntvätt": ["munskölj", "flux", "listerine", "mouthwash", "sb12"],
        "Tandtråd": ["tandtråd", "dental floss", "plackers", "mellanrumsborste", "tandpetare"],
        
        # --- KLÄDER & ACCESSOARER ---
        "Damtröja": ["damtröja", "stickad tröja dam", "cardigan dam", "kofta dam"],
        "Blus": ["blus", "blouse", "tunika"],
        "T-shirt Dam": ["t-shirt dam", "t-shirt kvinna"],
        "Linne Dam": ["linne dam", "tank top dam", "top dam", "topp dam"],
        
        "Damjeans": ["damjeans", "jeans dam", "denim dam"],
        "Dambyxor": ["dambyxor", "byxor dam", "chinos dam", "kostymbyxor dam"],
        "Leggings & Tights": ["leggings", "tights", "träningsbyxor dam"],
        "Kjolar": ["kjol", "skirt", "minikjol", "midikjol", "maxikjol"],
        
        "Klänningar": ["klänning", "dress", "sommarklänning", "festklänning", "maxiklänning"],
        "Underkläder Dam": ["bh", "trosor", "bralette", "panties", "string", "hipster", "strumpbyxor"],
        "Badkläder Dam": ["bikini", "baddräkt", "bikinitopp", "bikinitrosa", "badkläder dam"],
        
        "Herrskjorta": ["herrskjorta", "skjorta herr", "linneskjorta herr", "oxfordskjorta"],
        "Herrtröja": ["herrtröja", "stickad tröja herr", "pullover herr"],
        "T-shirt Herr": ["t-shirt herr", "t-shirt man"],
        "Hoodie Herr": ["hoodie herr", "munkjacka herr", "sweatshirt herr"],
        
        "Herrjeans": ["herrjeans", "jeans herr"],
        "Herrbyxor": ["herrbyxor", "byxor herr", "kostymbyxor herr", "mjukisbyxor herr"],
        "Chinos": ["chinos herr", "chinosbyxor"],
        "Shorts Herr": ["shorts herr", "badshorts herr", "cargoshorts"],
        
        "Underkläder Herr": ["kalsonger", "boxer", "briefs", "strumpor herr"],
        "Badkläder Herr": ["badbyxor", "badshorts herr", "simbyxor"],
        
        "Sneakers": ["sneaker", "sneakers", "skor", "shoes", "adidas stan smith", "nike air force", "vans"],
        "Tygskor": ["tygskor", "canvas shoes", "converse"],
        
        "Kängor & Boots": ["känga", "kängor", "boots", "stövlar", "chelsea boots", "timberland"],
        "Finskor": ["finskor", "oxford shoes", "derby skor", "brogues", "loafers"],
        "Klackskor": ["klackskor", "pumps", "stiletter", "högklackat", "heels"],
        
        "Löparskor": ["löparskor", "running shoes", "asics", "hoka", "brooks"],
        "Träningsskor": ["träningsskor", "gymskor", "training shoes", "crossfit"],
        "Sandaler": ["sandaler", "sandal", "tofflor", "birkenstock", "flip-flops"],
        
        "Handväskor": ["handväska", "väska dam", "axelremsväska", "clutch", "tote bag", "shopper", "totebag"],
        "Tygkassar": ["tygkasse", "canvas bag"],
        
        "Ryggsäckar": ["ryggsäck", "backpack", "fjällräven", "kånken", "eastpak"],
        "Datorväskor": ["datorväska", "laptopväska", "briefcase"],
        
        "Plånböcker": ["plånbok", "wallet", "korthållare", "card holder"],
        
        "Halsband": ["halsband", "necklace", "choker", "hänge"],
        "Armband": ["armband", "bracelet", "bangle"],
        "Örhängen": ["örhänge", "örhängen", "earrings", "piercing", "creoler", "studs"],
        "Ringar": ["ring", "ringar", "förlovningsring", "vigselring"],
        
        "Armbandsur Herr": ["klocka herr", "armbandsur herr", "kronograf herr"],
        "Armbandsur Dam": ["klocka dam", "armbandsur dam"],
        "Smartwatches": ["smartwatch", "apple watch", "galaxy watch", "garmin", "fitbit", "sportklocka"],
        
        "Solglasögon": ["solglasögon", "sunglasses", "ray-ban", "oakley", "polaroid"],
        "Kontaktlinser": ["kontaktlinser", "linser", "contact lenses", "dailies", "månadslinser", "endagslinser"],
        
        # --- HEM & HUSHÅLL ---
        "Tvättmedel": ["tvättmedel", "via", "ariel", "laundry detergent", "tvättkapslar"],
        "Sköljmedel": ["sköljmedel", "comfort", "softlan"],
        "Fläckborttagning": ["fläckborttagning", "vanish", "galltvål", "ta bort", "tabort"],
        
        "Diskmedel": ["diskmedel", "yes", "sun", "finish", "disktabletter", "maskindisk"],
        "Allrengöring": ["allrengöring", "rengöringsspray", "ajax", "windex", "grönsåpa", "såpa"],
        "Fönsterputs": ["fönsterputs", "fönsterrengöring", "window cleaner"],
        "Moppar & Trasor": ["mopp", "vileda", "swiffer", "skurtrasa", "wettex", "microfiber", "disktrasa"],
        
        "Stekpannor": ["stekpanna", "grillpanna", "wokpanna"],
        "Kastruller": ["kastrull", "såskastrull", "mjölkkastrull"],
        "Gjutjärnsgrytor": ["gjutjärnsgryta", "le creuset", "skeppshult", "gryta"],
        
        "Köksknivar": ["kökskniv", "kockkniv", "brödkniv", "skalkniv", "filékniv", "santoku", "global"],
        "Skärbrädor": ["skärbräda", "skärbräde", "chopping board"],
        "Köksapparater": ["matberedare", "blender", "stavmixer", "elvisp", "brödrost", "vattenkokare", "kaffebryggare", "smörgåsgrill", "våffeljärn", "airfryer", "fritös", "köksmaskin", "ankarsrum", "kitchenaid", "slowcooker"],
        
        "Taklampor": ["taklampa", "plafond", "pendellampa", "kristallkrona"],
        "Bordslampor": ["bordslampa", "fönsterlampa", "skrivbordslampa"],
        "Golvlampor": ["golvlampa", "läslampa"],
        
        "Glödlampor": ["glödlampa", "halogenlampa", "lysrör"],
        "Smart Belysning": ["philips hue", "smart lampa", "trådfri", "lifx"],
        "LED-lampor": ["led-lampa", "led lampa"],
        
        "Påslakan": ["påslakan", "bäddset", "påslakanset"],
        "Örngott": ["örngott"],
        "Lakan": ["lakan", "underlakan", "dra-på-lakan"],
        
        "Handdukar": ["handduk", "badlakan", "gästhandduk", "towel", "badhandduk"],
        "Kökshanddukar": ["kökshandduk", "släng"],
        "Mattor": ["matta", "ullmatta", "plastmatta", "bomullsmatta", "Ryamatta", "gångmatta", "dörrmatta", "badrumsmatta"],
        
        # --- TEKNIK & DATORER ---
        "Laptops": ["laptop", "macbook", "bärbar dator", "chromebook", "dator"],
        "Stationära Datorer": ["stationär dator", "desktop pc", "imac", "mac mini", "gamingdator", "gaming pc"],
        
        "Surfplattor": ["ipad", "surfplatta", "tablet", "galaxy tab", "lenovo tab"],
        "Bildskärmar": ["skärm", "bildskärm", "monitor", "datorskärm"],
        
        "Tangentbord": ["tangentbord", "keyboard", "mekaniskt tangentbord", "logitech", "corsair", "razer"],
        "Datormöss": ["datormus", "mouse", "gamingmus", "trådlös mus"],
        "Webbkameror": ["webbkamera", "webcam"],
        
        "Mobiltelefoner iPhone": ["iphone"],
        "Mobiltelefoner Android": ["samsung galaxy", "smartphone", "android", "google pixel", "oneplus", "xiaomi", "motorola", "sony xperia"],
        
        "Mobilskal": ["mobilskal", "skal iphone", "skal samsung", "silikonskal", "ideal of sweden"],
        "Mobilfodral": ["plånboksfodral", "mobilfodral"],
        "Skärmskydd": ["skärmskydd", "screen protector", "pansarglas", "cally", "zagg", "panzerglass"],
        "Mobilladdare": ["mobilladdare", "laddkabel", "lightning", "usb-c", "magsafe", "väggladdare"],
        
        "In-ear Hörlurar": ["in-ear", "earbuds", "snäckor"],
        "Over-ear Hörlurar": ["over-ear", "on-ear", "headset", "brusreducerande hörlurar", "hörlurar"],
        "True Wireless": ["true wireless", "airpods", "galaxy buds", "trådlösa in-ear"],
        
        "Bluetooth-högtalare": ["bluetooth-högtalare", "bärbar högtalare", "jbl", "ue boom", "marshall", "högtalare"],
        "Smarta Högtalare": ["google nest", "amazon echo", "smart högtalare", "homepod"],
        "Soundbars": ["soundbar", "hemmabio", "surround"],
        
        "TV-apparater": ["tv", "oled", "qled", "smart-tv", "samsung tv", "lg tv", "philips tv", "sony tv", "tv-apparat"],
        "Projektorer": ["projektor", "hemmabioprojektor"],
        
        "Spelkonsoler": ["ps5", "xbox", "nintendo switch", "playstation"],
        "TV-spel": ["ps5-spel", "xbox-spel", "switch-spel", "pc-spel", "spel", "playstation-spel", "nintendo-spel"],
        "Gamingheadset": ["gamingheadset", "gaming hörlurar"],
        "Möss & Tangentbord Gaming": ["gamingmus", "gamingtangentbord"],
        
        "Routers": ["router", "wifi-router", "trådlös router"],
        "Mesh-nätverk": ["mesh", "wifi-system", "deco", "orbi", "eero", "google wifi"],
        
        "Övervakningskamera": ["övervakningskamera", "ip-kamera", "arlo", "ringkamera", "webkamera övervakning", "ring doorbell"],
        "Hemlarm": ["hemlarm", "larmpaket", "inbrottslarm"],
        
        # --- BARN & FAMILJ ---
        "Blöjor": ["blöjor", "libero", "pampers", "diapers", "badblöjor"],
        "Våtservetter": ["våtservetter", "baby wipes"],
        "Babyolja": ["babyolja", "baby oil", "barnolja", "babyschampo", "babybad", "babylotion"],
        "Badbaljor": ["badbalja", "babybadkar"],
        
        "Nappar": ["napp", "nappar", "pacifier", "esska", "mam", "bibs", "napphållare"],
        "Nappflaskor": ["nappflaska", "babyflaska", "drickmugg barn", "pipmugg", "twistshake", "dr. brown"],
        "Bröstpumpar": ["bröstpump", "amningspump", "medela", "philips avent", "amningsinlägg", "mjölkuppsamlare"],
        
        "LEGO": ["lego", "lego city", "lego star wars", "lego friends", "lego ninjago", "lego technic", "lego creator", "lego super mario", "lego harry potter"],
        "Duplo": ["duplo", "lego duplo"],
        "Träklossar": ["träklossar", "byggklossar trä", "kapla", "Brio"],
        
        "Dockor": ["docka", "barbie", "baby born", "l.o.l", "lol surprise", "skrållan"],
        "Gosedjur": ["gosedjur", "kramdjur", "nalle", "squishmallows", "teddybjörn", "jellycat"],
        "Lekfigurer": ["lekfigur", "actionfigur", "schleich", "paw patrol", "peppa pig", "gretas gris", "bamse"],
        
        "Pussel": ["pussel", "barnpussel", "knopppussel", "ravensburger", "träpussel"],
        "Brädspel Barn": ["barnspel", "sällskapsspel barn", "fiska damm", "memory", "lotto", "alfapet junior", "monopoly junior", "kalaha"],
        
        "Sittvagnar": ["sittvagn", "sulky", "resevagn", "framåtvänd vagn", "babyzen yoyo"],
        "Liggvagnar": ["liggvagn", "kombivagn", "duovagn", "barnvagn", "bugaboo", "emmaljunga", "cybex"],
        "Bilbarnstolar": ["bilbarnstol", "besafe", "cybex", "maxi-cosi", "bältesstol", "babyskydd"],
        
        "Barnstolar": ["barnstol", "matstol barn", "tripp trapp", "stokke", "antilop", "fåtölj barn", "barnbord"],
        "Spjälsängar": ["spjälsäng", "sebra säng", "bedside crib", "babykorg", "vagga", "resesäng", "babynest"],
        
        "Babykläder": ["body", "sparkbyxa", "babykläder", "pyjamas baby", "dregglis", "babysockor"],
        "Ytterplagg Barn": ["overall", "barnjacka", "vindfleece", "regnkläder barn", "skaljacka", "vinteroverall", "galonbyxor"],
        "Underkläder Barn": ["kalsonger barn", "trosor barn", "strumpor barn", "underställ barn", "långkalsonger barn"],
        
        "Barnsneakers": ["sneakers barn", "gympaskor barn", "barnsko", "barnskor"],
        "Gummistövlar Barn": ["gummistövlar barn", "regnstövlar barn", "tretorn", "kavat"],
        "Vinterskor Barn": ["vinterskor barn", "barnkängor", "kuoma", "sorel", "viking"],
        
        # --- SPORT & FRITID ---
        "Proteinpulver Whey": ["whey", "vassle", "vassleprotein", "proteinpulver whey", "whey-80", "whey-100", "protein"],
        "Proteinpulver Vegan": ["vegan protein", "sojaprotein", "ärtprotein", "hampaprotein", "veganskt protein"],
        "Gainer": ["gainer", "mass gainer", "weight gainer", "kolhydrater", "maltodextrin"],
        
        "PWO": ["pwo", "pre-workout", "pre workout"],
        "Kreatin": ["kreatin", "creatine", "creatine monohydrate"],
        "BCAA & EAA": ["bcaa", "eaa", "aminosyror", "amino acids"],
        
        "Energidryck": ["energidryck", "nocco", "celsius", "red bull", "monster", "powerking", "clean drink", "prime", "sportdryck"],
        "Proteinbars": ["proteinbar", "protein bar", "bars", "barebells", "swebar", "star nutrition", "propud", "maxim"],
        
        "Cyklar": ["cykel", "herrcykel", "damcykel", "barncykel", "mountainbike", "mtb", "elcykel", "racer", "citybike", "hybridcykel", "bmx"],
        "Cykelhjälmar": ["cykelhjälm"],
        "Cykellås": ["cykellås", "bygellås", "kättinglås", "vajerlås", "abus", "kryptonite", "basta"],
        "Cykelbelysning": ["cykellampa", "cykelbelysning", "framlampa", "baklampa", "pannlampa", "reflexer", "lyse cykel", "lyktor cykel"],
        
        "Yogamattor": ["yogamatta", "träningsmatta", "pilatesmatta", "gymmatta"],
        "Hantlar": ["hantlar", "hantel", "vikter", "kettlebell", "skivstång", "viktskivor"],
        "Träningshandskar": ["träningshandskar", "gymhandskar", "dragremmar", "kalk", "magnesium"],
        
        "Tält": ["tält", "kupoltält", "tunneltält", "camping", "fjälltält", "familjetält", "outwell", "hilleberg", "marmot", "jack wolfskin"],
        "Ryggsäckar Vandring": ["vandringsryggsäck", "trekkingryggsäck", "dagtursryggsäck", "osprey", "lundhags"],
        "Stormkök": ["stormkök", "trangiakök", "primus", "gaskök", "spritkök", "friluftskök", "campingkök", "muurikka"],
        
        # --- HUSDJUR ---
        "Hundmat Torrfoder": ["hundmat", "hundfoder", "torrfoder hund", "pedigree", "royal canin", "eukanuba", "orijen", "acana", "hills", "purina"],
        "Hundmat Våtfoder": ["våtfoder hund", "burkmat hund", "hundmat våt", "cesar", "bozita"],
        "Hundgodis": ["hundgodis", "hundkex", "hundbelöning", "frolic"],
        "Tuggben": ["tuggben", "hundben", "märgben", "tuggpinnar", "tjurmuskel"],
        
        "Halsband & Koppel": ["hundhalsband", "hundkoppel", "hundsele", "spårlina", "flexikoppel", "retrieverkoppel", "halvstryp"],
        "Hundbäddar": ["hundbädd", "hundkorg", "hundsäng", "biabädd", "hundmadrass", "hundfilt"],
        "Hundleksaker": ["hundleksak", "hundleksaker", "pip-leksak", "tuggleksak", "aktiveringsleksak", "kong"],
        
        "Kattmat Torrfoder": ["kattmat", "kattfoder", "torrfoder katt", "whiskas", "purina", "royal canin katt", "hills katt", "acana katt", "orijen katt", "iam"],
        "Kattmat Våtfoder": ["våtfoder katt", "kattmat våt", "kattmat burk", "latz", "sheba", "gourmet", "bozita katt"],
        "Kattgodis": ["kattgodis", "kattsnacks", "dreamies", "kattmjölk", "kattmalt", "kattmynta"],
        
        "Kattleksaker": ["kattleksak", "kattleksaker", "kattvippa", "katt laser", "kattboll", "möss", "kattmynta-leksak", "aktiveringsleksak katt"],
        "Klösträd": ["klösträd", "klösbräda", "klösmöbel", "katt träd", "katt klös"],
        "Kattsand": ["kattsand", "kattströ", "ever clean", "kristallsand", "peewee", "träpellets", "kattgrus", "bentonit"],
        "Kattlådor": ["kattlåda", "kattlådor", "kattsandlåda", "katt toalett", "kattoalett", "peewee låda", "kattlåda med tak"],
        
        "Foder Smådjur": ["kaninmat", "marsvinsmat", "hamstermat", "pellets kanin", "hö", "höbriketter", "gnagarfoder", "gnagarblandning", "halm"],
        "Fågelmat": ["fågelfrö", "talgbollar", "solrosfrö", "jordnötter för fåglar", "vildfågelfrö", "papegojmat", "undulatmat", "kanariemat", "hirskolvar", "fågelmatare"],
        
        # --- MAT & DRYCK ---
        "Läskedryck": ["coca-cola", "pepsi", "fanta", "sprite", "läsk", "soda", "trocamare", "julmust", "påskmust", "7up", "dr pepper", "mountain dew"],
        "Mineralvatten": ["ramlösa", "loka", "mineralvatten", "kolsyrat vatten", "bubbelvatten", "vichyvatten", "san pellegrino"],
        "Saft": ["saft", "blandsaft", "hallonsaft", "apelsinsaft", "flädersaft", "bob", "fun light", "zeroh", "sirap"],
        
        "Hela Kaffebönor": ["kaffebönor", "hela bönor", "kaffe"],
        "Bryggkaffe": ["bryggkaffe", "zoegas", "löfbergs", "gevalia", "arvid nordquist", "classic", "kokkaffe", "malet kaffe"],
        "Kaffekapslar": ["kaffekapslar", "nespresso", "dolce gusto", "tassimo", "kaffepads", "senseo", "espresso kapslar"],
        "Tepåsar": ["te", "tepåsar", "lipton", "pukka", "clipper", "earl grey", "grönt te", "svart te"],
        "Löste": ["löste", "löst te", "kusmi", "teburk"],
        
        "Choklad & Praliner": ["choklad", "marabou", "fazer", "chocolate", "praliner", "chokladkaka", "toblerone", "lindt", "kexchoklad", "noblesse", "alladin", "paradis"],
        "Chips & Bågar": ["chips", "olw", "estrella", "pringles", "ostbågar", "doritos", "tortillachips", "popcorn", "snacks", "nachos", "dipmix", "dipp"],
        "Lösgodis": ["lösgodis", "smågodis", "karamell", "vingummi", "lakrits", "bilar", "ahlgrens bilar", "skumtomtar", "geléhallon", "nappar", "kryptoniter", "godis"],
        
        "Kryddor": ["svartpeppar", "vitpeppar", "kanel", "kardemumma", "paprikapulver", "oregano", "timjan", "basilika", "rosmarin", "salt", "grillkrydda", "taco krydda", "kryddmix", "buljong", "fond", "santa maria", "kockens"],
        "Baktillbehör": ["mjöl", "socker", "strösocker", "florsocker", "farinsocker", "sirap", "bakpulver", "vaniljsocker", "torrjäst", "jäst", "kakao", "mandelmassa", "pärlsocker", "strössel", "hushållsfärg"]
    }

    total_updated = 0

    for cat_name, keywords in rules.items():
        if cat_name not in cat_map:
            continue
            
        cat_id = cat_map[cat_name]
        patterns = []
        for k in keywords:
            safe_k = re.escape(k) 
            # Om ordet är kort (<=3 tecken), kräv word boundaries (\y i postgres regex)
            if len(k) <= 3:
                patterns.append(f"\\y{safe_k}\\y") 
            else:
                patterns.append(safe_k)
        
        regex_pattern = f"({'|'.join(patterns)})"
        
        sql = text("""
            UPDATE products 
            SET category_id = :cid 
            WHERE category_id IS NULL 
            AND name ~* :pattern
        """)
        
        result = db.execute(sql, {"cid": cat_id, "pattern": regex_pattern})
        count = result.rowcount
        
        if count > 0:
            total_updated += count
            db.commit()

    return total_updated

def run_ai_categorization_bulk(db: Session, cat_names: list, cat_map: dict, limit_count: int = None):
    # NYTT: Initiera Client istället för configure()
    client = genai.Client(api_key=GOOGLE_API_KEY)
    
    # NYTT: Konfigurations-objekt för det nya SDK:t
    generate_config = types.GenerateContentConfig(
        response_mime_type="application/json"
    )
    
    BATCH_SIZE = 50 
    backoff_time = 30
    processed_count = 0
    
    while True:
        if limit_count and processed_count >= limit_count:
            break
            
        current_limit = BATCH_SIZE
        if limit_count:
            remaining = limit_count - processed_count
            if remaining < BATCH_SIZE:
                current_limit = remaining

        # Hämta BARA id och namn (Lean loading)
        batch = db.query(Product.id, Product.name)\
            .filter(Product.category_id == None)\
            .limit(current_limit)\
            .all()
        
        if not batch:
            break
            
        logger.info(f"   🔄 AI Batch: Bearbetar {len(batch)} produkter...")
        
        product_list_str = json.dumps([{"id": p.id, "name": p.name} for p in batch], ensure_ascii=False)
        categories_str = ", ".join(cat_names)
        
        prompt = f"""
        Uppgift: Kategorisera dessa produkter till EXAKT en av dessa kategorier: {categories_str}.
        
        Regler:
        1. Försök vara specifik.
        2. Om helt omöjligt att avgöra, hoppa över produkten.
        
        Returnera en JSON-lista: [{{ "id": 123, "category": "Kategorinamn" }}]
        
        Produkter:
        {product_list_str}
        """

        try:
            # NYTT: Anrop med nya SDK-syntaxen
            response = client.models.generate_content(
                model=GOOGLE_AI_MODEL,
                contents=prompt,
                config=generate_config
            )
            
            matches = json.loads(response.text)
            
            mappings = []
            for match in matches:
                pid = match.get("id")
                cname = match.get("category")
                
                if cname in cat_map:
                    mappings.append({
                        "id": pid,
                        "category_id": cat_map[cname]
                    })
            
            if mappings:
                db.bulk_update_mappings(Product, mappings)
                db.commit()
                logger.info(f"      ✅ AI lyckades kategorisera {len(mappings)} av {len(batch)}.")
            
            processed_count += len(batch)
            time.sleep(1) 

        except Exception as e:
            err_msg = str(e)
            logger.error(f"      ❌ Fel i batch: {e}")
            # Enkel backoff-logik för rate limits
            if "429" in err_msg or "Quota" in err_msg or "ResourceExhausted" in err_msg:
                logger.warning(f"      🛑 QUOTA EXCEEDED! Pausar {backoff_time}s...")
                time.sleep(backoff_time)
                backoff_time = min(backoff_time * 2, 60)
            else:
                logger.warning("      ⚠️ Hoppar över batch pga okänt fel.")
                break