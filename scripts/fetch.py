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

# Define Pydantic Schema
class CherryPickedItem(BaseModel):
    index: int
    category: str
    subcategory: str
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
                if (domain in UNIVERSAL_POOL or domain in whitelist) and article.get("description"):
                    global_filtered_pool.append(article)
            except Exception:
                continue

    if len(global_filtered_pool) < 2:
        print("Not enough fresh whitelisted news found this hour across all desks.")
        return
        
    global_selection_prompt = "Review this aggregated pool of global breaking news and select the absolute best items:\n\n"
    for i, article in enumerate(global_filtered_pool):
        global_selection_prompt += f"Index: {i} | Raw Title: {article.get('title')} - Raw Description: {article.get('description')}\n"
        
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
                "2. 'description': Completely ignore boring source placeholders like 'Get caught up'. Rewrite into a single, highly intriguing sentence hook in standard Sentence Case that forces a user to click.\n"
                "3. 'category': Classify into one of these strict lowercase strings: politics_government, economy_business_finance, science_technology, sport, arts_culture_entertainment, crime_law_justice, environment.\n"
                "4. 'subcategory': Define a sharp single-word lowercase or snake_case noun classification.\n"
                "5. 'interest_score': Assign an engagement value from 1 to 100 based entirely on how shocking or engaging the story is.\n\n"
                "STRICT CONSTRAINT RULES:\n"
                "- Max 3 items assigned to any single category string.\n"
                "- No topical duplication."
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