"""
fetch_internships.py
====================
Scrapes REAL internship data from the PM Internship Portal
(pminternship.mca.gov.in) using Playwright headless browser.
How it works:
  1. Opens the PM portal in headless Chromium
  2. Waits for JS to render Featured Internships cards
  3. Extracts card text (Company, Title, Field, Sector, State)
  4. Navigates carousel arrows to get more cards
  5. Changes State filters to get listings from different regions
  6. Parses all unique cards into structured JSON
  7. Saves to jobs.json
All apply_urls point to the official PM Internship Portal.
Usage:
    pip install playwright && python -m playwright install chromium
    python fetch_internships.py
"""
import json
import os
import re
import time
from dotenv import load_dotenv
load_dotenv(".env.txt")
JOBS_JSON_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "jobs.json")
PM_PORTAL_URL = "https://pminternship.mca.gov.in/"
SOURCE_NAME = "PM Internship Portal"
def extract_featured_text(page) -> str:
    """Extract the Featured Internships section text from the rendered page."""
    return page.evaluate("""
        () => {
            const all = document.querySelectorAll('*');
            for (const el of all) {
                const t = el.innerText || '';
                if (t.includes('Featured Internships') && t.includes('View Details')) {
                    // Find the section between "Featured Internships" and "Dashboard"
                    const start = t.indexOf('Featured Internships');
                    const end = t.indexOf('Dashboard');
                    if (start >= 0 && end > start) {
                        return t.substring(start, end);
                    }
                    return t.substring(start, start + 5000);
                }
            }
            return '';
        }
    """)
def parse_featured_text(text: str) -> list:
    """Parse the Featured Internships text into structured listings."""
    listings = []
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    i = 0
    while i < len(lines):
        if lines[i] == "Pin" and i + 1 < len(lines) and lines[i + 1] == "Compare":
            card_lines = []
            j = i + 2
            while j < len(lines):
                if lines[j] == "Pin" or lines[j] == "Explore More Internships" or lines[j] == "Dashboard":
                    break
                card_lines.append(lines[j])
                j += 1
            if len(card_lines) >= 3:
                listing = parse_card_lines(card_lines)
                if listing:
                    listings.append(listing)
            i = j
        else:
            i += 1
    return listings
def parse_card_lines(card_lines: list) -> dict:
    """Parse individual card lines into a structured listing."""
    clean = []
    for l in card_lines:
        if l in ("View Details", "From your location", "/", "Check Eligibility"):
            continue
        if re.match(r'^\d+\.?\d*\s*km$', l):
            continue
        if l.startswith("Select ") or l == "Remove Filters":
            continue
        clean.append(l)
    if len(clean) < 2:
        return None
    company = clean[0]
    title = clean[1] if len(clean) > 1 else "Internship"
    fields = []
    state = ""
    for l in clean[2:]:
        if l.isupper() and len(l) > 2 and not any(c.isdigit() for c in l):
            state = l
        elif "/" in l or any(kw in l.lower() for kw in ["service", "marketing", "account", "engineer",
                "research", "manufactur", "maintenance", "admin", "sales", "logistics", "health",
                "banking", "technology", "energy", "retail", "fmcg", "customer", "design"]):
            fields.append(l)
    if not state:
        for l in clean[2:]:
            for s in INDIAN_STATES:
                if s in l.upper():
                    state = s
                    break
    field_text = " / ".join(fields)
    sector = fields[0] if fields else infer_sector(f"{title} {company}")
    return {
        "title": title,
        "company": company.title() if company.isupper() else company,
        "location": state.title() if state else "India",
        "sector": sector,
        "field": field_text,
        "education": "Graduate",
        "description": f"{title} at {company.title() if company.isupper() else company} under PM Internship Scheme. Location: {state.title() if state else 'India'}.",
        "skills": infer_skills(title, sector, field_text),
    }
INDIAN_STATES = [
    "ANDHRA PRADESH", "ARUNACHAL PRADESH", "ASSAM", "BIHAR", "CHHATTISGARH",
    "GOA", "GUJARAT", "HARYANA", "HIMACHAL PRADESH", "JHARKHAND", "KARNATAKA",
    "KERALA", "MADHYA PRADESH", "MAHARASHTRA", "MANIPUR", "MEGHALAYA", "MIZORAM",
    "NAGALAND", "ODISHA", "PUNJAB", "RAJASTHAN", "SIKKIM", "TAMIL NADU",
    "TELANGANA", "TRIPURA", "UTTAR PRADESH", "UTTARAKHAND", "WEST BENGAL",
    "DELHI", "JAMMU AND KASHMIR", "LADAKH", "PUDUCHERRY", "CHANDIGARH",
    "ANDAMAN AND NICOBAR", "DADRA AND NAGAR HAVELI", "DAMAN AND DIU", "LAKSHADWEEP",
]
def infer_sector(text: str) -> str:
    text_lower = text.lower()
    mapping = {
        "software": "IT & Technology", "computer": "IT & Technology", "developer": "IT & Technology",
        "research": "Research & Development", "aviation": "Aviation & Defence",
        "banking": "Banking & Finance", "finance": "Banking & Finance", "insurance": "Banking & Finance",
        "oil": "Oil, Gas & Energy", "petroleum": "Oil, Gas & Energy", "gas": "Oil, Gas & Energy",
        "manufactur": "Manufacturing", "maintenance": "Manufacturing",
        "retail": "FMCG & Retail", "fmcg": "FMCG & Retail", "merchandis": "FMCG & Retail",
        "sales": "Sales & Marketing", "marketing": "Sales & Marketing",
        "health": "Healthcare", "pharma": "Pharmaceuticals",
        "customer": "Customer Service", "admin": "Administration",
        "engineer": "Engineering", "mechanic": "Engineering",
        "telecom": "Telecommunications", "power": "Power & Energy",
        "construction": "Construction", "mining": "Mining",
        "logistics": "Logistics", "hotel": "Hospitality",
        "agriculture": "Agriculture", "education": "Education",
    }
    for kw, sec in mapping.items():
        if kw in text_lower:
            return sec
    return "General"
def infer_skills(title: str, sector: str = "", field: str = "") -> list:
    text = f"{title} {sector} {field}".lower()
    ordered_matches = []
    skill_rules = [
        (("python",), "python"),
        (("sql", "database"), "sql"),
        (("excel", "spreadsheet"), "excel"),
        (("power bi", "dashboard", "analytics"), "data analysis"),
        (("software", "developer", "coding", "programming"), "software development"),
        (("computer", "it ", "technology", "desktop"), "computer skills"),
        (("network", "networking", "server"), "networking"),
        (("support", "helpdesk", "customer"), "customer service"),
        (("sales",), "sales"),
        (("marketing", "brand", "campaign"), "marketing"),
        (("account", "accounting"), "accounting"),
        (("finance", "banking"), "financial analysis"),
        (("data entry", "data processing"), "data entry"),
        (("admin", "administration", "office"), "administration"),
        (("hr", "human resource", "recruit"), "human resources"),
        (("logistics", "warehouse", "dispatch", "inventory", "supply chain"), "logistics"),
        (("packaging",), "packaging"),
        (("mechanic", "mechanical"), "mechanical skills"),
        (("electrical", "electric", "power"), "electrical work"),
        (("welding", "welder"), "welding"),
        (("plumbing", "plumber"), "plumbing"),
        (("manufactur", "production", "plant", "assembly"), "manufacturing"),
        (("maintenance", "repair"), "maintenance"),
        (("quality", "inspection"), "quality control"),
        (("research", "analysis", "lab"), "research & analysis"),
        (("design", "cad", "drawing"), "design"),
        (("agri", "farming", "fertilizer"), "agriculture"),
        (("telecom",), "telecommunications"),
        (("communication", "coordinator", "relations"), "communication"),
    ]
    for keywords, skill in skill_rules:
        if any(keyword in text for keyword in keywords):
            ordered_matches.append(skill)
    if not ordered_matches:
        fallback = infer_sector(text).lower()
        sector_defaults = {
            "it & technology": ["computer skills", "software development"],
            "banking & finance": ["accounting", "financial analysis"],
            "fmcg & retail": ["sales", "customer service"],
            "logistics": ["logistics", "inventory"],
            "engineering": ["engineering", "maintenance"],
            "manufacturing": ["manufacturing", "quality control"],
        }
        ordered_matches.extend(sector_defaults.get(fallback, ["communication"]))
    deduped = []
    seen = set()
    for skill in ordered_matches:
        key = skill.casefold()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(skill)
    return deduped[:6]
def scrape_pm_portal() -> list:
    """Use Playwright to scrape real internship data from PM portal."""
    from playwright.sync_api import sync_playwright
    print("\n  [Playwright] Launching headless Chromium...")
    all_listings = []
    seen_keys = set()
    geolocations = [
        {"name": "Hyderabad", "lat": 17.385, "lon": 78.487},
        {"name": "Delhi", "lat": 28.614, "lon": 77.209},
        {"name": "Mumbai", "lat": 19.076, "lon": 72.878},
        {"name": "Bangalore", "lat": 12.972, "lon": 77.595},
        {"name": "Chennai", "lat": 13.083, "lon": 80.271},
        {"name": "Kolkata", "lat": 22.573, "lon": 88.364},
        {"name": "Pune", "lat": 18.520, "lon": 73.857},
        {"name": "Ahmedabad", "lat": 23.023, "lon": 72.572},
    ]
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for geo in geolocations:
            print(f"\n  >> Scraping from {geo['name']}...")
            context = browser.new_context(
                viewport={"width": 1440, "height": 900},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                locale="en-IN",
                geolocation={"latitude": geo["lat"], "longitude": geo["lon"]},
                permissions=["geolocation"],
            )
            page = context.new_page()
            try:
                page.goto(PM_PORTAL_URL, timeout=60000, wait_until="commit")
            except:
                print(f"    Navigation timeout, continuing...")
            time.sleep(20)
            page.evaluate("window.scrollTo(0, 1000)")
            time.sleep(3)
            featured = extract_featured_text(page)
            if featured:
                listings = parse_featured_text(featured)
                for l in listings:
                    key = f"{l['title']}-{l['company']}"
                    if key not in seen_keys:
                        seen_keys.add(key)
                        all_listings.append(l)
                print(f"    Found {len(listings)} cards, {len(all_listings)} unique total")
            for click in range(5):
                try:
                    page.evaluate("""
                        () => {
                            const btns = document.querySelectorAll('button, [role="button"]');
                            for (const btn of btns) {
                                const rect = btn.getBoundingClientRect();
                                const text = (btn.textContent || '').trim();
                                if ((text === '>' || text === '›' || text === '→') &&
                                    rect.y > 300 && rect.y < 800 && rect.width > 0 && rect.width < 80) {
                                    btn.click();
                                    return true;
                                }
                            }
                            // Try SVG arrows
                            const arrows = document.querySelectorAll('svg');
                            for (const svg of arrows) {
                                const rect = svg.getBoundingClientRect();
                                if (rect.x > 1200 && rect.y > 400 && rect.y < 800) {
                                    svg.parentElement.click();
                                    return true;
                                }
                            }
                            return false;
                        }
                    """)
                    time.sleep(2)
                    featured = extract_featured_text(page)
                    if featured:
                        listings = parse_featured_text(featured)
                        for l in listings:
                            key = f"{l['title']}-{l['company']}"
                            if key not in seen_keys:
                                seen_keys.add(key)
                                all_listings.append(l)
                except:
                    pass
            context.close()
            if len(all_listings) >= 30:
                print(f"\n  >> Got {len(all_listings)} unique listings, stopping.")
                break
        browser.close()
    return all_listings
def normalize_listing(item: dict, idx: int) -> dict:
    """Final normalization to our JSON schema."""
    return {
        "id": idx,
        "title": item.get("title", "PM Scheme Internship"),
        "company": item.get("company", "PM Internship Scheme"),
        "location": item.get("location", "India"),
        "sector": item.get("sector", "General"),
        "field": item.get("field", ""),
        "education": item.get("education", "Graduate"),
        "description": item.get("description", "Internship under PM Internship Scheme."),
        "skills": item.get("skills", ["communication"])[:5],
        "apply_url": PM_PORTAL_URL,
        "source": SOURCE_NAME,
    }
def fetch_and_save_internships(min_results: int = 3) -> list:
    scraped = scrape_pm_portal()
    if len(scraped) < min_results:
        raise RuntimeError(f"Only found {len(scraped)} internship listings from the PM portal.")
    final_data = [normalize_listing(item, idx + 1) for idx, item in enumerate(scraped)]
    with open(JOBS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(final_data, f, indent=2, ensure_ascii=False)
    return final_data
def main():
    print("=" * 60)
    print("  PM Internship Scheme - Live Data Pipeline")
    print("  Source: pminternship.mca.gov.in")
    print("  32,000+ real internship opportunities")
    print("=" * 60)
    scraped = []
    try:
        scraped = scrape_pm_portal()
    except ImportError:
        print("\n  Playwright not installed!")
        print("  Run: pip install playwright && python -m playwright install chromium")
    except Exception as e:
        print(f"\n  Scraping failed: {e}")
        import traceback
        traceback.print_exc()
    if scraped and len(scraped) >= 3:
        print(f"\n>> Scraped {len(scraped)} REAL internships from PM portal!")
        final_data = [normalize_listing(item, idx + 1) for idx, item in enumerate(scraped)]
        with open(JOBS_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(final_data, f, indent=2, ensure_ascii=False)
        print(f"\nSaved {len(final_data)} internships to jobs.json")
        print(f"All apply URLs -> {PM_PORTAL_URL}")
        print("\nSample listings:")
        for item in final_data[:8]:
            print(f"  {item['id']}. {item['title']} @ {item['company']} ({item['location']}) [{item['sector']}]")
    else:
        print(f"\n>> Only got {len(scraped)} results.")
        try:
            with open(JOBS_JSON_PATH, "r", encoding="utf-8") as f:
                existing = json.load(f)
            print(f">> Keeping existing {len(existing)} listings in jobs.json")
        except:
            print(">> No existing jobs.json found.")
    print("=" * 60)
if __name__ == "__main__":
    main()