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

interface CurrentsArticle {
  id: string;
  title: string;
  description: string;
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
              if (isWhitelisted && item.description && item.title) {
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
      globalSelectionPrompt += `Index: ${i} | Raw Title: ${article.title} - Raw Description: ${article.description}\n`;
    });

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
2. 'description': Completely ignore boring source placeholders like 'Get caught up'. Rewrite into a single, highly intriguing sentence hook in standard Sentence Case that forces a user to click.
3. 'category': Classify into one of these strict lowercase strings: politics_government, economy_business_finance, science_technology, sport, arts_culture_entertainment, crime_law_justice, environment.
4. 'subcategory': Define a sharp single-word lowercase or snake_case noun classification.
5. 'interest_score': Assign an engagement value from 1 to 100 based entirely on how shocking or engaging the story is.

STRICT CONSTRAINT RULES:
- Max 3 items assigned to any single category string.
- No topical duplication.`,
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
                  interest_score: { type: 'INTEGER' },
                  title: { type: 'STRING' },
                  description: { type: 'STRING' },
                },
                required: ['index', 'category', 'subcategory', 'interest_score', 'title', 'description'],
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
