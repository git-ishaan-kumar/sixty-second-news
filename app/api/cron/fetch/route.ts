import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { NewsCategory } from '@/types/supabase';

// Security configuration
const CRON_SECRET = process.env.CRON_SECRET;
const CURRENTS_API_KEY = process.env.CURRENTS_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Whitelist specifications matching fetch.py
const UNIVERSAL_POOL = [
  'reuters.com',
  'apnews.com',
  'bloomberg.com',
  'bbc.com',
  'bbc.co.uk',
  'afp.com',
  'axios.com',
  'npr.org',
  'cnm.com',
  'cnn.com',
  'theguardian.com',
  'dw.com',
  'france24.com',
];

const CATEGORY_WHITELISTS: Record<NewsCategory, string[]> = {
  science_technology: [
    'techcrunch.com',
    'theverge.com',
    'wired.com',
    'arstechnica.com',
    'technologyreview.com',
    'engadget.com',
    'venturebeat.com',
    'zdnet.com',
    'thenextweb.com',
    'nature.com',
    'newscientist.com',
    'space.com',
  ],
  economy_business_finance: [
    'wsj.com',
    'cnbc.com',
    'ft.com',
    'marketwatch.com',
    'fastcompany.com',
    'forbes.com',
    'fortune.com',
    'businessinsider.com',
    'hbr.org',
    'economist.com',
    'nikkeiasia.com',
  ],
  politics_government: [
    'politico.com',
    'politico.eu',
    'thehill.com',
    'foreignpolicy.com',
    'foreignaffairs.com',
    'axios.com/local',
    'rollcall.com',
    'washingtonpost.com',
    'nytimes.com',
    'csmonitor.com',
    'spectator.co.uk',
    'newstatesman.com',
  ],
  sport: [
    'espn.com',
    'theathletic.com',
    'skysports.com',
    'bleacherreport.com',
    'cbssports.com',
    'nbcsports.com',
    'si.com',
    'foxsports.com',
    'thescore.com',
    'fifa.com',
    'uefa.com',
    'olympics.com',
  ],
  arts_culture_entertainment: [
    'variety.com',
    'hollywoodreporter.com',
    'ign.com',
    'polygon.com',
    'rollingstone.com',
    'deadline.com',
    'ew.com',
    'billboard.com',
    'gamespot.com',
    'pitchfork.com',
    'vulture.com',
  ],
  crime_law_justice: [
    'scotusblog.com',
    'law.com',
    'propublica.org',
    'lawfaremedia.org',
    'thecrimereport.org',
    'courtnewsservice.com',
    'abajournal.com',
    'justia.com',
    'jurist.org',
    'themarshallproject.org',
  ],
  environment: [
    'nationalgeographic.com',
    'insideclimatenews.org',
    'grist.org',
    'earth.org',
    'climatechangenews.com',
    'carbonbrief.org',
    'mongabay.com',
    'treehugger.com',
    'weather.com',
    'unep.org',
    'nature.org',
  ],
};

const CANONICAL_TAXONOMY: Record<NewsCategory, string[]> = {
  arts_culture_entertainment: [
    "animation", "architecture", "art_exhibitions_and_museums", "cinema_and_movies",
    "dance_and_ballet", "fashion_and_design", "festivals_and_events", "literature_and_publishing",
    "music_and_audio", "news_and_mass_media", "social_media_and_influencers", "television_and_streaming",
    "theater_and_performing_arts", "visual_arts_and_photography"
  ],
  crime_law_justice: [
    "civil_and_administrative_law", "corporate_and_financial_crime", "corruption_and_bribery",
    "courts_and_judiciary", "cyber_crime", "drug_trafficking_and_crimes", "homicide_and_violent_crime",
    "human_trafficking_and_smuggling", "international_law_and_tribunals", "investigations_and_arrests",
    "law_enforcement_and_police", "organized_crime_and_gangs", "robbery_theft_and_fraud",
    "supreme_and_appellate_courts", "terrorism_and_war_crimes"
  ],
  economy_business_finance: [
    "advertising_and_marketing", "aerospace_and_defense", "agriculture_and_forestry",
    "automotive_and_manufacturing", "banking_and_financial_services", "central_banks_and_monetary_policy",
    "commodities_and_raw_materials", "construction_and_real_estate", "consumer_goods_and_retail",
    "cryptocurrency_and_fintech", "energy_oil_and_gas", "healthcare_and_pharmaceuticals",
    "inflation_and_macroeconomics", "mergers_acquisitions_and_buyouts", "renewable_energy_and_utilities",
    "startups_and_venture_capital", "stocks_bonds_and_securities", "technology_hardware_and_chips",
    "telecommunications_and_wireless", "transportation_and_logistics"
  ],
  environment: [
    "air_and_water_pollution", "animals_and_wildlife", "climate_change_and_global_warming",
    "conservation_and_nature_preserves", "ecosystems_and_biodiversity", "endangered_and_invasive_species",
    "forests_and_deforestation", "hazardous_and_waste_materials", "oceans_rivers_and_marine_life",
    "sustainability_and_green_policy"
  ],
  politics_government: [
    "armed_forces_and_military", "campaign_finance_and_lobbying", "diplomacy_and_international_relations",
    "elections_and_voting", "espionage_and_national_security", "foreign_aid_and_sanctions",
    "government_budget_and_taxation", "immigration_and_border_policy", "legislation_and_parliaments",
    "local_and_state_government", "political_parties_and_candidates", "public_health_and_social_policy",
    "referendums_and_civic_initiatives", "refugees_and_humanitarian_crises"
  ],
  science_technology: [
    "aerospace_and_rocketry", "agricultural_and_food_tech", "artificial_intelligence",
    "astronomy_and_space_exploration", "biotechnology_and_genetics", "chemistry_and_materials_science",
    "computer_science_and_software", "electronic_engineering_and_chips", "geology_and_earth_sciences",
    "marine_and_ocean_sciences", "mathematics_and_physics", "medical_research_and_neuroscience",
    "robotics_and_automation", "social_sciences_and_psychology"
  ],
  sport: [
    "american_football", "athletics_track_and_field", "auto_racing_and_motorsports", "baseball",
    "basketball", "combat_sports_and_martial_arts", "cricket", "cycling", "equestrian_and_horse_racing",
    "esports_and_gaming", "field_hockey_and_lacrosse", "golf", "gymnastics", "ice_hockey",
    "olympics_and_paralympics", "rugby", "sailing_and_water_sports", "skiing_and_winter_sports",
    "soccer", "swimming_and_diving", "tennis_and_racket_sports", "volleyball"
  ]
};

interface CurrentsArticle {
  id: string;
  title: string;
  description: string;
  content?: string;
  url: string;
  author: string;
  image: string;
  language: string;
  category: string[];
  published: string;
}

interface GeminiSelectionItem {
  index: number;
  category: string;
  subcategory: string;
  entities: string[];
  interest_score: number;
  title: string;
  description: string;
}

interface GeminiSelectionResponse {
  selections: GeminiSelectionItem[];
}

export async function GET(request: Request) {
  // 1. Verify Authorization Header UNCOMMENT SOON
  // const authHeader = request.headers.get('Authorization');
  // if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  // Ensure other env variables are set
  if (!CURRENTS_API_KEY || !GEMINI_API_KEY) {
    console.error('Missing required environment variables (CURRENTS_API_KEY or GEMINI_API_KEY).');
    return NextResponse.json({ error: 'Configuration Error' }, { status: 500 });
  }

  try {
    const supabase = createAdminClient();

    // 2. Fetch existing article URLs from the database to prevent duplicate requests/processing
    const { data: existingArticles, error: fetchUrlsError } = await supabase
      .from('articles')
      .select('source_url');

    if (fetchUrlsError) {
      console.error('Error fetching existing articles from database:', fetchUrlsError);
      return NextResponse.json({ error: 'Database fetch error' }, { status: 500 });
    }

    const existingUrlsSet = new Set(existingArticles?.map((a) => a.source_url) || []);
    const globalFilteredPool: CurrentsArticle[] = [];

    // 3. Query Currents API for each category concurrently using Promise.all
    const categories = Object.keys(CATEGORY_WHITELISTS) as NewsCategory[];
    
    await Promise.all(
      categories.map(async (category) => {
        const whitelist = CATEGORY_WHITELISTS[category];
        const currentsUrl = `https://api.currentsapi.services/v2/latest-news?language=en&category=${category}&apiKey=${CURRENTS_API_KEY}`;
        
        try {
          const res = await fetch(currentsUrl, { next: { revalidate: 0 } });
          if (!res.ok) {
            console.error(`Currents API error for category ${category}: ${res.statusText}`);
            return;
          }
          
          const data = await res.json();
          const newsItems: CurrentsArticle[] = data.news || [];
          
          let categoryIngestedCount = 0;
          for (const item of newsItems) {
            // Trim to a lean pool: max 5 articles per category to reduce Gemini token payload weight and speed up generation
            if (categoryIngestedCount >= 5) {
              break;
            }

            if (!item.url || existingUrlsSet.has(item.url)) {
              continue;
            }

            try {
              const urlObj = new URL(item.url);
              const domain = urlObj.hostname.replace('www.', '');
              
              const isWhitelisted = UNIVERSAL_POOL.includes(domain) || whitelist.includes(domain);
              const hasText = item.content?.trim() || item.description?.trim();
              if (isWhitelisted && hasText && item.title) {
                globalFilteredPool.push(item);
                categoryIngestedCount++;
              }
            } catch (urlErr) {
              // Ignore invalid URLs
            }
          }
        } catch (catErr) {
          console.error(`Error fetching category ${category} from Currents API:`, catErr);
        }
      })
    );

    console.log(`Aggregated pool size: ${globalFilteredPool.length} articles.`);

    if (globalFilteredPool.length < 2) {
      console.log('Not enough fresh whitelisted news found this hour.');
      return NextResponse.json({ 
        message: 'No news processing required. Filtered pool size is under threshold.',
        poolSize: globalFilteredPool.length
      });
    }

    // 4. Build selection prompt for Gemini
    let globalSelectionPrompt = 'Review this aggregated pool of global breaking news and select the absolute best items:\n\n';
    globalFilteredPool.forEach((article, i) => {
      const articleText = article.content?.trim() || article.description?.trim() || '';
      globalSelectionPrompt += `Index: ${i} | Raw Title: ${article.title} - Article Body Text: ${articleText}\n`;
    });

    const formattedTaxonomyInstructions = JSON.stringify(CANONICAL_TAXONOMY, null, 2);

    // 5. Query Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
    const geminiPayload = {
      contents: [
        {
          parts: [
            {
              text: globalSelectionPrompt,
            },
          ],
        },
      ],
      systemInstruction: {
        parts: [
          {
            text: `You are the Executive Editor-in-Chief for Sixty Second News (SSN). Analyze the compiled raw headlines pool. Cherrypick up to 12 of the absolute most shocking, interesting, or globally impactful articles. Skip routine or boring pieces.

DYNAMIC EDITORIAL REWRITING MANDATE:
For each item you choose, you must completely rewrite the text fields to match premium news standards before returning them:
1. 'title': Rewrite into a snappy, front-loaded, high-engagement headline under 80 characters. Use strict, standard Title Case. Never pass raw or lazy titles.
2. 'description': EXTRACT HARD FACT SUMMARY. Completely ignore lazy teaser strings or clickbait hooks like 'we uncover this in our article'. Read the entire provided Article Body Text and synthesize its primary factual outcome into a single, comprehensive sentence case summary hook that delivers hard news values.
3. 'category': Classify into one of these strict lowercase strings: politics_government, economy_business_finance, science_technology, sport, arts_culture_entertainment, crime_law_justice, environment.
4. 'subcategory': STRICT CANONICAL TAXONOMY MANDATE. You MUST select ONE exact subcategory string matching the item's category from this dictionary:
${formattedTaxonomyInstructions}
5. 'entities': Extract 3 to 6 key searchable entity keywords/phrases (people, teams, companies, locations, events, key terms) mentioned in or strictly relevant to the article so users can search for them in the search bar.
6. 'interest_score': Assign an engagement value from 1 to 100 based entirely on how shocking or engaging the story is.

STRICT CONSTRAINT RULES:
- Max 3 items assigned to any single category string.
- NO TOPICAL DUPLICATION: Scan across all categories for overlapping subject matter or shared core nouns (e.g., matching stories about the same celebrity incident like the Tate brothers, or the same cinematic event like Christopher Nolan). If multiple publishers are covering the exact same real-world event, cherrypick only the single most informative article variant with the highest natural structural interest value and ignore the remaining copies entirely.`,
          },
        ],
      },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            selections: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  index: { type: 'INTEGER' },
                  category: { type: 'STRING' },
                  subcategory: { type: 'STRING' },
                  entities: {
                    type: 'ARRAY',
                    items: { type: 'STRING' },
                  },
                  interest_score: { type: 'INTEGER' },
                  title: { type: 'STRING' },
                  description: { type: 'STRING' },
                },
                required: ['index', 'category', 'subcategory', 'entities', 'interest_score', 'title', 'description'],
              },
            },
          },
          required: ['selections'],
        },
      },
    };

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error(`Gemini API error: ${geminiResponse.status} ${geminiResponse.statusText}. Response: ${errText}`);
      return NextResponse.json({ error: 'Gemini API call failed' }, { status: 502 });
    }

    const geminiData = await geminiResponse.json();
    const generatedText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      console.error('Gemini returned an empty or invalid structure:', JSON.stringify(geminiData));
      return NextResponse.json({ error: 'Invalid response from Gemini' }, { status: 502 });
    }

    // Parse the JSON selections returned by Gemini
    let selections: GeminiSelectionItem[] = [];
    try {
      const parsed: GeminiSelectionResponse = JSON.parse(generatedText);
      selections = parsed.selections || [];
    } catch (parseErr) {
      console.error('Failed to parse Gemini selection JSON:', parseErr, 'Generated text:', generatedText);
      return NextResponse.json({ error: 'Failed to parse Gemini output' }, { status: 502 });
    }

    // 6. Map selections back to their metadata and prepare articles list
    const articlesToUpsert = [];
    for (const item of selections) {
      const idx = item.index;
      if (idx === undefined || idx < 0 || idx >= globalFilteredPool.length) {
        continue;
      }

      const rawArticle = globalFilteredPool[idx];
      const aiCategory = item.category as NewsCategory;
      const targetUrl = rawArticle.url;
      const rawImage = rawArticle.image;

      // Handle fallback media backgrounds
      const imgValue = (rawImage && rawImage !== 'None' && rawImage.trim() !== '')
        ? rawImage
        : `PLACEHOLDER_${aiCategory.toUpperCase()}`;

      articlesToUpsert.push({
        category: aiCategory,
        subcategory: item.subcategory,
        entities: item.entities || [],
        interest_score: item.interest_score,
        title: item.title,
        description: item.description,
        image: imgValue,
        source_url: targetUrl,
        published_at: rawArticle.published || new Date().toISOString(),
      });
    }

    console.log(`Upserting ${articlesToUpsert.length} cherrypicked articles to database.`);

    if (articlesToUpsert.length > 0) {
      const { error: upsertError } = await supabase
        .from('articles')
        .upsert(articlesToUpsert, { onConflict: 'source_url' });

      if (upsertError) {
        console.error('Database upsert error:', upsertError);
        return NextResponse.json({ error: 'Database upsert failed', details: upsertError.message }, { status: 500 });
      }
    }

    // 7. Database Hygiene - Delete articles older than 5 days
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const dateLimitIso = fiveDaysAgo.toISOString();

    console.log(`Performing database hygiene. Deleting articles published before ${dateLimitIso}`);
    const { data: deletedData, error: deleteError } = await supabase
      .from('articles')
      .delete()
      .lt('published_at', dateLimitIso)
      .select('id');

    if (deleteError) {
      console.error('Error during database hygiene / deletion:', deleteError);
      // We don't fail the request here since upserting was successful
    } else {
      console.log(`Hygiene complete. Deleted ${deletedData?.length || 0} old articles.`);
    }

    // 8. Database Sync Tracking - Insert completion confirmation log
    const { error: syncLogError } = await supabase
      .from('sync_logs')
      .insert({ status: 'completed' });
      
    if (syncLogError) {
      console.error('Failed to write completion to sync_logs:', syncLogError);
    }

    return NextResponse.json({
      success: true,
      processed: articlesToUpsert.length,
      deleted: deletedData?.length || 0,
    });

  } catch (err: any) {
    console.error('Pipeline unhandled execution error:', err);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}
