import os
import json
import requests
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
from google import genai
from google.genai import types
from pydantic import BaseModel
from dotenv import load_dotenv

# Initialize Environment
script_dir = os.path.dirname(__file__)
root_dir = os.path.abspath(os.path.join(script_dir, ".."))
load_dotenv(os.path.join(root_dir, ".env"))

CURRENTS_API_KEY = os.environ.get("CURRENTS_API_KEY")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

# Setup Gemini API
client = genai.Client(api_key=GEMINI_API_KEY)

# Define Canonical Subcategory Taxonomy
CANONICAL_TAXONOMY = {
    "arts_culture_entertainment": [
        "animation", "architecture", "art_exhibitions_and_museums", "cinema_and_movies",
        "dance_and_ballet", "fashion_and_design", "festivals_and_events", "literature_and_publishing",
        "music_and_audio", "news_and_mass_media", "social_media_and_influencers", "television_and_streaming",
        "theater_and_performing_arts", "visual_arts_and_photography"
    ],
    "crime_law_justice": [
        "civil_and_administrative_law", "corporate_and_financial_crime", "corruption_and_bribery",
        "courts_and_judiciary", "cyber_crime", "drug_trafficking_and_crimes", "homicide_and_violent_crime",
        "human_trafficking_and_smuggling", "international_law_and_tribunals", "investigations_and_arrests",
        "law_enforcement_and_police", "organized_crime_and_gangs", "robbery_theft_and_fraud",
        "supreme_and_appellate_courts", "terrorism_and_war_crimes"
    ],
    "economy_business_finance": [
        "advertising_and_marketing", "aerospace_and_defense", "agriculture_and_forestry",
        "automotive_and_manufacturing", "banking_and_financial_services", "central_banks_and_monetary_policy",
        "commodities_and_raw_materials", "construction_and_real_estate", "consumer_goods_and_retail",
        "cryptocurrency_and_fintech", "energy_oil_and_gas", "healthcare_and_pharmaceuticals",
        "inflation_and_macroeconomics", "mergers_acquisitions_and_buyouts", "renewable_energy_and_utilities",
        "startups_and_venture_capital", "stocks_bonds_and_securities", "technology_hardware_and_chips",
        "telecommunications_and_wireless", "transportation_and_logistics"
    ],
    "environment": [
        "air_and_water_pollution", "animals_and_wildlife", "climate_change_and_global_warming",
        "conservation_and_nature_preserves", "ecosystems_and_biodiversity", "endangered_and_invasive_species",
        "forests_and_deforestation", "hazardous_and_waste_materials", "oceans_rivers_and_marine_life",
        "sustainability_and_green_policy"
    ],
    "politics_government": [
        "armed_forces_and_military", "campaign_finance_and_lobbying", "diplomacy_and_international_relations",
        "elections_and_voting", "espionage_and_national_security", "foreign_aid_and_sanctions",
        "government_budget_and_taxation", "immigration_and_border_policy", "legislation_and_parliaments",
        "local_and_state_government", "political_parties_and_candidates", "public_health_and_social_policy",
        "referendums_and_civic_initiatives", "refugees_and_humanitarian_crises"
    ],
    "science_technology": [
        "aerospace_and_rocketry", "agricultural_and_food_tech", "artificial_intelligence",
        "astronomy_and_space_exploration", "biotechnology_and_genetics", "chemistry_and_materials_science",
        "computer_science_and_software", "electronic_engineering_and_chips", "geology_and_earth_sciences",
        "marine_and_ocean_sciences", "mathematics_and_physics", "medical_research_and_neuroscience",
        "robotics_and_automation", "social_sciences_and_psychology"
    ],
    "sport": [
        "american_football", "athletics_track_and_field", "auto_racing_and_motorsports", "baseball",
        "basketball", "combat_sports_and_martial_arts", "cricket", "cycling", "equestrian_and_horse_racing",
        "esports_and_gaming", "field_hockey_and_lacrosse", "golf", "gymnastics", "ice_hockey",
        "olympics_and_paralympics", "rugby", "sailing_and_water_sports", "skiing_and_winter_sports",
        "soccer", "swimming_and_diving", "tennis_and_racket_sports", "volleyball"
    ]
}

# Define Pydantic Schema
class CherryPickedItem(BaseModel):
    index: int
    category: str
    subcategory: str
    entities: list[str]
    interest_score: int
    title: str
    description: str

class CherryPickedFeed(BaseModel):
    selections: list[CherryPickedItem]

# Define Source Whitelists
UNIVERSAL_POOL = [
    "reuters.com", "apnews.com", "bloomberg.com", "bbc.com", "bbc.co.uk",
    "afp.com", "axios.com", "npr.org", "cnm.com", "cnn.com", "theguardian.com",
    "dw.com", "france24.com"
]

CATEGORY_WHITELISTS = {
    "science_technology": [
        "techcrunch.com", "theverge.com", "wired.com", "arstechnica.com",
        "technologyreview.com", "engadget.com", "venturebeat.com", "zdnet.com",
        "thenextweb.com", "nature.com", "newscientist.com", "space.com"
    ],
    "economy_business_finance": [
        "wsj.com", "cnbc.com", "ft.com", "marketwatch.com", "fastcompany.com",
        "forbes.com", "fortune.com", "businessinsider.com", "hbr.org",
        "economist.com", "nikkeiasia.com"
    ],
    "politics_government": [
        "politico.com", "politico.eu", "thehill.com", "foreignpolicy.com",
        "foreignaffairs.com", "axios.com/local", "rollcall.com",
        "washingtonpost.com", "nytimes.com", "csmonitor.com", "spectator.co.uk",
        "newstatesman.com"
    ],
    "sport": [
        "espn.com", "theathletic.com", "skysports.com", "bleacherreport.com",
        "cbssports.com", "nbcsports.com", "si.com", "foxsports.com",
        "thescore.com", "fifa.com", "uefa.com", "olympics.com"
    ],
    "arts_culture_entertainment": [
        "variety.com", "hollywoodreporter.com", "ign.com", "polygon.com",
        "rollingstone.com", "deadline.com", "ew.com", "billboard.com",
        "gamespot.com", "pitchfork.com", "vulture.com"
    ],
    "crime_law_justice": [
        "scotusblog.com", "law.com", "propublica.org", "lawfaremedia.org",
        "thecrimereport.org", "courtnewsservice.com", "abajournal.com",
        "justia.com", "jurist.org", "themarshallproject.org"
    ],
    "environment": [
        "nationalgeographic.com", "insideclimatenews.org", "grist.org",
        "earth.org", "climatechangenews.com", "carbonbrief.org", "mongabay.com",
        "treehugger.com", "weather.com", "unep.org", "nature.org"
    ]
}

# Fetch and Process Content
def run_pipeline():
    master_output_pool = []
    global_filtered_pool = []
    
    cache_path = os.path.join(script_dir, "processed_urls.json")
    url_cache = {}
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r") as f:
                url_cache = json.load(f)
        except Exception:
            url_cache = {}
            
    now = datetime.now(timezone.utc)
    three_days_ago = now - timedelta(days=3)
    url_cache = {url: ts for url, ts in url_cache.items() if datetime.fromisoformat(ts) > three_days_ago}

    for category, whitelist in CATEGORY_WHITELISTS.items():
        url = f"https://api.currentsapi.services/v2/latest-news?language=en&category={category}&apiKey={CURRENTS_API_KEY}"
        response = requests.get(url)
        
        if response.status_code != 200:
            continue
            
        data = response.json()
        raw_articles = data.get("news", [])
        
        for article in raw_articles:
            try:
                article_url = article.get("url", "")
                if article_url in url_cache:
                    continue
                    
                domain = urlparse(article_url).hostname.replace("www.", "")
                article_text = article.get("content")
                if not article_text or article_text.strip() == "":
                    article_text = article.get("description")
                
                if (domain in UNIVERSAL_POOL or domain in whitelist) and article_text and article_text.strip():
                    global_filtered_pool.append(article)
            except Exception:
                continue

    if len(global_filtered_pool) < 2:
        print("Not enough fresh whitelisted news found this hour across all desks.")
        return
        
    global_selection_prompt = "Review this aggregated pool of global breaking news and select the absolute best items:\n\n"
    for i, article in enumerate(global_filtered_pool):
        article_text = article.get("content")
        if not article_text or article_text.strip() == "":
            article_text = article.get("description", "")
        global_selection_prompt += f"Index: {i} | Raw Title: {article.get('title')} - Article Body Text: {article_text}\n"

    formatted_taxonomy_instructions = json.dumps(CANONICAL_TAXONOMY, indent=2)

    selection_response = client.models.generate_content(
        model="gemini-3.1-flash-lite",
        contents=global_selection_prompt,
        config=types.GenerateContentConfig(
            system_instruction=(
                "You are the Executive Editor-in-Chief for Sixty Second News (SSN). "
                "Analyze the compiled raw headlines pool. Cherrypick up to 12 of the absolute most shocking, interesting, or globally impactful articles. Skip routine or boring pieces.\n\n"
                "DYNAMIC EDITORIAL REWRITING MANDATE:\n"
                "For each item you choose, you must completely rewrite the text fields to match premium news standards before returning them:\n"
                "1. 'title': Rewrite into a snappy, front-loaded, high-engagement headline under 80 characters. Use strict, standard Title Case. Never pass raw or lazy titles.\n"
                "2. 'description': EXTRACT HARD FACT SUMMARY. Completely ignore lazy teaser strings or clickbait hooks like 'we uncover this in our article'. Read the entire provided Article Body Text and synthesize its primary factual outcome into a single, comprehensive sentence case summary hook that delivers hard news values.\n"
                "3. 'category': Classify into one of these strict lowercase strings: politics_government, economy_business_finance, science_technology, sport, arts_culture_entertainment, crime_law_justice, environment.\n"
                f"4. 'subcategory': STRICT CANONICAL TAXONOMY MANDATE. You MUST select ONE exact subcategory string matching the item's category from this dictionary:\n{formatted_taxonomy_instructions}\n"
                "5. 'entities': Extract 3 to 6 key searchable entity keywords/phrases (people, teams, companies, locations, events, key terms) mentioned in or strictly relevant to the article so users can search for them in the search bar.\n"
                "6. 'interest_score': Assign an engagement value from 1 to 100 based entirely on how shocking or engaging the story is.\n\n"
                "STRICT CONSTRAINT RULES:\n"
                "- Max 3 items assigned to any single category string.\n"
                "- NO TOPICAL DUPLICATION: Scan across all categories for overlapping subject matter or shared core nouns (e.g., matching stories about the same celebrity incident like the Tate brothers, or the same cinematic event like Christopher Nolan). If multiple publishers are covering the exact same real-world event, cherrypick only the single most informative article variant with the highest natural structural interest value and ignore the remaining copies entirely."
            ),
            response_mime_type="application/json",
            response_schema=CherryPickedFeed,
        ),
    )
    
    try:
        selected_data = json.loads(selection_response.text)
        selections = selected_data.get("selections", [])
    except Exception:
        print("Failed to parse cherrypicked selection model response.")
        return
        
    for item in selections:
        index = item.get("index")
        if index is None or index >= len(global_filtered_pool):
            continue
            
        target = global_filtered_pool[index]
        ai_category = item.get("category")
        target_url = target.get("url")
        
        url_cache[target_url] = now.isoformat()
        raw_image = target.get("image")
        img_value = raw_image if raw_image and raw_image != "None" and raw_image.strip() != "" else f"PLACEHOLDER_{ai_category.upper()}"

        master_output_pool.append({
            "id": target.get("id", str(index)),
            "category": ai_category,
            "subcategory": item.get("subcategory"),
            "entities": item.get("entities", []),
            "interest_score": item.get("interest_score"),
            "title": item.get("title"),          
            "description": item.get("description"),  
            "image": img_value,
            "source_url": target_url,
            "published_at": target.get("published")
        })
            
    with open(cache_path, "w") as f:
        json.dump(url_cache, f, indent=2)

    output_path = os.path.join(script_dir, "output_feed.json")
    with open(output_path, "w") as f:
        json.dump(master_output_pool, f, indent=2)
        
    print(f"Dumped {len(master_output_pool)} headlines to {output_path}.")

# Execute Pipeline
if __name__ == "__main__":
    run_pipeline()