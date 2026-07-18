'use server';

import { createClient } from '@/utils/supabase/server';
import { Article, CATEGORIES, CategoryRatings } from '@/types/supabase';

/**
 * Fetches articles from the database, filters by category if provided,
 * and sorts them using an Exponential Time-Decay Gravity formula.
 *
 * Formula: Final Score = interest_score / ((Hours Since Published + 2) ^ 1.5)
 *
 * @param category The category filter ('all' or a specific category string)
 * @returns Sorted array of articles
 */
export async function getFeed(category: string | 'all'): Promise<Article[]> {
  const supabase = await createClient();

  let query = supabase.from('articles').select('*');

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data: articles, error } = await query;

  if (error) {
    console.error('Error fetching articles in getFeed:', error);
    throw new Error(`Failed to fetch feed: ${error.message}`);
  }

  if (!articles || articles.length === 0) {
    return [];
  }

  const now = Date.now();

  const scoredArticles = articles.map((article: Article) => {
    const publishedTime = new Date(article.published_at).getTime();
    // Calculate difference in hours
    const diffMs = now - publishedTime;
    const hoursSincePublished = Math.max(0, diffMs / (1000 * 60 * 60));
    
    // Apply gravity formula: Final Score = interest_score / ((Hours Since Published + 2) ^ 1.5)
    const finalScore = article.interest_score / Math.pow(hoursSincePublished + 2, 1.5);

    return {
      article,
      finalScore,
    };
  });

  // Sort by finalScore in descending order (highest score first)
  scoredArticles.sort((a, b) => b.finalScore - a.finalScore);

  return scoredArticles.map((item) => item.article);
}

/**
 * Fetches and weights articles dynamically based on the user's explicit ratings.
 *
 * Sorting priority:
 * 1. Preferred categories (rating > 0) are ordered based on rating, rank within category,
 *    and system interest_score (as tie-breaker/fine-tuner).
 * 2. Fallback categories (rating <= 0) are appended and sorted by raw system interest_score.
 *
 * @param userId The user's Supabase auth ID
 * @returns Array of sorted, personalized articles
 */
export async function getPersonalizedFeed(userId: string): Promise<Article[]> {
  const supabase = await createClient();

  // 1. Fetch the user's profile and category ratings
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('category_ratings')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching user profile for personalization:', profileError);
    // Continue with default ratings if profile fetch fails
  }

  const ratings: CategoryRatings = profile?.category_ratings || {
    politics_government: 0,
    economy_business_finance: 0,
    science_technology: 0,
    sport: 0,
    arts_culture_entertainment: 0,
    crime_law_justice: 0,
    environment: 0,
  };

  // 2. Fetch recent articles
  const { data: articles, error: articlesError } = await supabase
    .from('articles')
    .select('*');

  if (articlesError) {
    console.error('Error fetching articles in getPersonalizedFeed:', articlesError);
    throw new Error(`Failed to fetch articles: ${articlesError.message}`);
  }

  if (!articles || articles.length === 0) {
    return [];
  }

  // 3. Group preferred articles (rating > 0) and fallback articles (rating <= 0)
  const articlesByCategory: Record<string, Article[]> = {};
  CATEGORIES.forEach((cat) => {
    articlesByCategory[cat] = [];
  });

  const fallbackArticles: Article[] = [];

  articles.forEach((article) => {
    const rating = ratings[article.category] || 0;
    if (rating > 0) {
      articlesByCategory[article.category].push(article);
    } else {
      fallbackArticles.push(article);
    }
  });

  // Sort each preferred category group by system interest_score descending
  CATEGORIES.forEach((cat) => {
    articlesByCategory[cat].sort((a, b) => b.interest_score - a.interest_score);
  });

  // Assign personalized score to preferred articles
  const scoredPreferred: { article: Article; score: number }[] = [];
  CATEGORIES.forEach((cat) => {
    const rating = ratings[cat] || 0;
    if (rating > 0) {
      articlesByCategory[cat].forEach((article, index) => {
        // Score = Rating - rank + (interest_score / 100)
        const score = rating - index + (article.interest_score / 100);
        scoredPreferred.push({ article, score });
      });
    }
  });

  // Sort preferred by personalized score descending
  scoredPreferred.sort((a, b) => b.score - a.score);
  const sortedPreferred = scoredPreferred.map((item) => item.article);

  // Sort fallback articles by system interest_score descending
  fallbackArticles.sort((a, b) => b.interest_score - a.interest_score);

  // Combine preferred and fallback articles (fallback is appended to ensure curated pool runs dry fallback)
  return [...sortedPreferred, ...fallbackArticles];
}
