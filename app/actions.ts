'use server';

import { createClient, createAdminClient } from '@/utils/supabase/server';
import { Article, CategoryRatings } from '@/types/supabase';

const SEARCH_ALIASES: Record<string, string> = {
  "ai": "artificial_intelligence",
  "ml": "computer_science_and_software",
  "gop": "politics_government",
  "dem": "politics_government",
  "crypto": "cryptocurrency_and_fintech",
  "ev": "automotive_and_manufacturing",
  "evs": "automotive_and_manufacturing",
  "uk": "United Kingdom",
  "us": "United States",
  "usa": "United States",
  "f1": "auto_racing_and_motorsports",
  "nfl": "american_football",
  "nba": "basketball",
  "epl": "soccer",
  "premier league": "soccer"
};

/**
 * Fetches articles from the database, filters by category if provided,
 * and sorts them using an Exponential Time-Decay Gravity formula.
 *
 * Formula: Final Score = interest_score / ((Hours Since Published + 2) ^ 1.5)
 *
 * @param category The category filter ('all' or a specific category string)
 * @returns Sorted array of articles
 */
export async function getFeed(category: string | 'all', searchQuery?: string): Promise<Article[]> {
  const supabase = await createClient();

  // Fetch current user session to filter out disliked articles
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  let query;

  if (searchQuery && searchQuery.trim()) {
    const cleanQuery = searchQuery.trim().toLowerCase();
    const normalizedQuery = SEARCH_ALIASES[cleanQuery] || cleanQuery;
    query = supabase.rpc('search_articles_rpc', {
      search_term: cleanQuery,
      normalized_term: normalizedQuery,
    });
  } else {
    query = supabase.from('articles').select('*');
  }

  if (userId) {
    const { data: dislikedRecords } = await supabase
      .from('user_interactions')
      .select('article_id')
      .eq('user_id', userId)
      .eq('reaction', 'dislike');

    const dislikedIds = dislikedRecords?.map((r) => r.article_id) || [];
    if (dislikedIds.length > 0) {
      query = query.not('id', 'in', `(${dislikedIds.join(',')})`);
    }
  }

  if (category && category !== 'all') {
    query = query.eq('category', category);
  }

  const { data, error } = await query;
  const articles = (data || []) as Article[];

  if (error) {
    console.error('Error fetching articles in getFeed:', error);
    throw new Error(`Failed to fetch feed: ${error.message}`);
  }

  if (!articles || articles.length === 0) {
    return [];
  }

  const now = Date.now();

  // Sort using Chronological Tiered Grouping Algorithm
  const sortedArticles = [...articles].sort((a, b) => {
    const diffA = now - new Date(a.published_at).getTime();
    const diffB = now - new Date(b.published_at).getTime();

    // Group 0 represents 0 to 3 days (0 to 72 hours), Group 1 represents 3 to 6 days (72 to 144 hours), etc.
    const groupA = Math.max(0, Math.floor(diffA / (72 * 60 * 60 * 1000)));
    const groupB = Math.max(0, Math.floor(diffB / (72 * 60 * 60 * 1000)));

    if (groupA !== groupB) {
      return groupA - groupB; // Sort chronological blocks: newest block (Group 0) first
    }

    if (b.interest_score !== a.interest_score) {
      return b.interest_score - a.interest_score; // Within the same block, sort by interest_score DESC
    }

    // Tie-breaker: newest publication date first
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });

  return sortedArticles;
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
export async function getPersonalizedFeed(userId: string, searchQuery?: string): Promise<Article[]> {
  const supabase = await createClient();

  // 1. Fetch user's seen articles to filter out
  const { data: seenRecords, error: seenError } = await supabase
    .from('user_seen_articles')
    .select('article_id')
    .eq('user_id', userId);

  if (seenError) {
    console.error('Error fetching seen articles:', seenError);
  }

  const seenIds = seenRecords?.map((r) => r.article_id) || [];

  // 1b. Fetch user's disliked articles to filter out
  const { data: dislikedRecords, error: dislikedError } = await supabase
    .from('user_interactions')
    .select('article_id')
    .eq('user_id', userId)
    .eq('reaction', 'dislike');

  if (dislikedError) {
    console.error('Error fetching disliked articles:', dislikedError);
  }

  const dislikedIds = dislikedRecords?.map((r) => r.article_id) || [];

  const excludeIds = Array.from(new Set([...seenIds, ...dislikedIds]));

  // 2. Fetch the user's profile and subcategory/entity ratings
  let { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('category_ratings')
    .eq('id', userId)
    .maybeSingle();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('Error fetching user profile for personalization:', profileError);
  }

  if (!profile && !profileError) {
    // Create user profile row dynamically using admin client if missing
    try {
      const adminSupabase = createAdminClient();
      const { data: userRecord } = await adminSupabase.auth.admin.getUserById(userId);
      const email = userRecord?.user?.email || '';
      const username = email.split('@')[0] || 'user';
      const { data: newProfile } = await adminSupabase
        .from('profiles')
        .insert({
          id: userId,
          username: username,
          email: email,
          category_ratings: {},
        })
        .select('category_ratings')
        .maybeSingle();
      
      if (newProfile) {
        profile = newProfile;
      }
    } catch (err) {
      console.error('Failed to dynamically create profile for personalization:', err);
    }
  }

  const ratings: CategoryRatings = profile?.category_ratings || {};

  // 3. Fetch recent articles (filtering out seen and disliked ones if any exist)
  let query;

  if (searchQuery && searchQuery.trim()) {
    const cleanQuery = searchQuery.trim().toLowerCase();
    const normalizedQuery = SEARCH_ALIASES[cleanQuery] || cleanQuery;
    query = supabase.rpc('search_articles_rpc', {
      search_term: cleanQuery,
      normalized_term: normalizedQuery,
    });
  } else {
    query = supabase.from('articles').select('*');
  }

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data, error: articlesError } = await query;
  const articles = (data || []) as Article[];

  if (articlesError) {
    console.error('Error fetching articles in getPersonalizedFeed:', articlesError);
    throw new Error(`Failed to fetch articles: ${articlesError.message}`);
  }

  // Fallback if the personalized pool runs dry
  if (!articles || articles.length === 0) {
    const feed = await getFeed('all', searchQuery);
    if (excludeIds.length > 0) {
      return feed.filter((article) => !excludeIds.includes(article.id));
    }
    return feed;
  }

  // 4. Calculate affinity score for each article based on subcategory & entities
  const calculateAffinity = (article: Article): number => {
    let subcatWeight = article.subcategory ? (ratings[article.subcategory] || 0) : 0;
    let entityWeight = 0;
    if (Array.isArray(article.entities)) {
      article.entities.forEach((entity: string) => {
        if (entity && entity.trim()) {
          const key = `entity:${entity.trim().toLowerCase()}`;
          entityWeight += (ratings[key] || 0);
        }
      });
    }
    return subcatWeight + entityWeight;
  };

  const now = Date.now();

  // Group articles by chronological blocks (0-3 days, 3-6 days, etc.)
  const groupsMap = new Map<number, Article[]>();
  articles.forEach((art) => {
    const diff = now - new Date(art.published_at).getTime();
    const group = Math.max(0, Math.floor(diff / (72 * 60 * 60 * 1000)));
    if (!groupsMap.has(group)) {
      groupsMap.set(group, []);
    }
    groupsMap.get(group)!.push(art);
  });

  const sortedGroups = Array.from(groupsMap.keys()).sort((a, b) => a - b);
  const finalFeed: Article[] = [];

  sortedGroups.forEach((groupKey) => {
    const groupArticles = groupsMap.get(groupKey)!;

    // Split into 3 pools within the chronological block:
    // High-Affinity (affinity > 0)
    // Discovery (affinity === 0, unrated subcategories/entities)
    // Suppressed (affinity < 0)
    const highAffinity: Article[] = [];
    const discovery: Article[] = [];
    const suppressed: Article[] = [];

    groupArticles.forEach((art) => {
      const score = calculateAffinity(art);
      if (score > 0) {
        highAffinity.push(art);
      } else if (score < 0) {
        suppressed.push(art);
      } else {
        discovery.push(art);
      }
    });

    // Sort High-Affinity DESC by affinity score, then interest_score DESC
    highAffinity.sort((a, b) => {
      const affA = calculateAffinity(a);
      const affB = calculateAffinity(b);
      if (affB !== affA) return affB - affA;
      if (b.interest_score !== a.interest_score) return b.interest_score - a.interest_score;
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });

    // Sort Discovery DESC by system interest_score, then publication date
    discovery.sort((a, b) => {
      if (b.interest_score !== a.interest_score) return b.interest_score - a.interest_score;
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });

    // Sort Suppressed DESC by affinity score (least negative first), then interest_score DESC
    suppressed.sort((a, b) => {
      const affA = calculateAffinity(a);
      const affB = calculateAffinity(b);
      if (affB !== affA) return affB - affA;
      if (b.interest_score !== a.interest_score) return b.interest_score - a.interest_score;
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });

    // Interleave High-Affinity (80%) and Discovery (20% slot allocation)
    const interleavedGroup: Article[] = [];
    let highIdx = 0;
    let discIdx = 0;
    let slotCount = 0;

    while (highIdx < highAffinity.length || discIdx < discovery.length) {
      slotCount++;
      // Every 5th item (20%) is reserved for Discovery if available
      const isDiscoverySlot = slotCount % 5 === 0;

      if (isDiscoverySlot) {
        if (discIdx < discovery.length) {
          interleavedGroup.push(discovery[discIdx++]);
        } else if (highIdx < highAffinity.length) {
          interleavedGroup.push(highAffinity[highIdx++]);
        }
      } else {
        if (highIdx < highAffinity.length) {
          interleavedGroup.push(highAffinity[highIdx++]);
        } else if (discIdx < discovery.length) {
          interleavedGroup.push(discovery[discIdx++]);
        }
      }
    }

    // Append Suppressed articles at the very end of the block
    finalFeed.push(...interleavedGroup, ...suppressed);
  });

  return finalFeed;
}

/**
 * Mutates an article's reaction metrics (likes/dislikes) and updates
 * the user's subcategory and entity preference weights in their profile.
 *
 * @param articleId The ID of the article being liked/disliked
 * @param action The action type ('like' | 'unlike' | 'dislike' | 'undislike')
 */
/**
 * Fetches the current user's liked and disliked article IDs.
 */
export async function getUserReactions(): Promise<{ likedArticleIds: string[]; dislikedArticleIds: string[] }> {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return { likedArticleIds: [], dislikedArticleIds: [] };
  }

  const { data, error } = await supabase
    .from('user_interactions')
    .select('article_id, reaction')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user reactions:', error);
    return { likedArticleIds: [], dislikedArticleIds: [] };
  }

  const likedArticleIds: string[] = [];
  const dislikedArticleIds: string[] = [];

  data.forEach((row) => {
    if (row.reaction === 'like') {
      likedArticleIds.push(row.article_id);
    } else if (row.reaction === 'dislike') {
      dislikedArticleIds.push(row.article_id);
    }
  });

  return { likedArticleIds, dislikedArticleIds };
}

export async function mutateArticleReaction(
  articleId: string,
  action: 'like' | 'unlike' | 'dislike' | 'undislike'
): Promise<{ success: boolean; likes: number; dislikes: number }> {
  const supabase = await createClient();

  // 1. Fetch current user session
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  // 2. Fetch the article's current metrics, subcategory, and entities
  const { data: article, error: articleError } = await supabase
    .from('articles')
    .select('category, subcategory, entities, likes, dislikes')
    .eq('id', articleId)
    .single();

  if (articleError || !article) {
    console.error('Error fetching article for mutation:', articleError);
    throw new Error('Article not found.');
  }

  // Calculate delta adjustments based on the action
  let deltaLikes = 0;
  let deltaDislikes = 0;
  let ratingDelta = 0;

  switch (action) {
    case 'like':
      deltaLikes = 1;
      ratingDelta = 10; // +10 for like
      break;
    case 'unlike':
      deltaLikes = -1;
      ratingDelta = -10; // -10 to reverse like
      break;
    case 'dislike':
      deltaDislikes = 1;
      ratingDelta = -15; // -15 for dislike
      break;
    case 'undislike':
      deltaDislikes = -1;
      ratingDelta = 15; // +15 to reverse dislike
      break;
  }

  // Determine updated values
  const updatedLikes = Math.max(0, article.likes + deltaLikes);
  const updatedDislikes = Math.max(0, article.dislikes + deltaDislikes);

  // 3. Perform global article metrics mutation in Supabase
  const { error: updateError } = await supabase
    .from('articles')
    .update({
      likes: updatedLikes,
      dislikes: updatedDislikes,
    })
    .eq('id', articleId);

  if (updateError) {
    console.error('Error updating article metrics:', updateError);
    throw new Error('Failed to update global metrics.');
  }

  // 4. Perform user-bound profiles ratings and user_interactions mutations if authenticated
  // Track weights for 'subcategory' and 'entities' instead of primary 'category'
  if (userId) {
    // A. Update user_interactions table
    if (action === 'like' || action === 'dislike') {
      const { error: interactionError } = await supabase
        .from('user_interactions')
        .upsert({
          user_id: userId,
          article_id: articleId,
          reaction: action,
        }, { onConflict: 'user_id,article_id' });

      if (interactionError) {
        console.error('Error saving user interaction:', interactionError);
      }
    } else if (action === 'unlike' || action === 'undislike') {
      const { error: interactionError } = await supabase
        .from('user_interactions')
        .delete()
        .eq('user_id', userId)
        .eq('article_id', articleId);

      if (interactionError) {
        console.error('Error deleting user interaction:', interactionError);
      }
    }

    // B. Update profiles category ratings via RPC
    if (article.subcategory) {
      const { error: rpcError } = await supabase.rpc('update_user_category_rating', {
        user_id: userId,
        cat_name: article.subcategory,
        rating_delta: ratingDelta,
      });
      if (rpcError) {
        console.error('Error updating subcategory rating via RPC:', rpcError);
      }
    }

    if (Array.isArray(article.entities)) {
      for (const entity of article.entities) {
        if (entity && entity.trim()) {
          const entityKey = `entity:${entity.trim().toLowerCase()}`;
          const { error: rpcError } = await supabase.rpc('update_user_category_rating', {
            user_id: userId,
            cat_name: entityKey,
            rating_delta: ratingDelta,
          });
          if (rpcError) {
            console.error('Error updating entity rating via RPC:', rpcError);
          }
        }
      }
    }
  }

  return {
    success: true,
    likes: updatedLikes,
    dislikes: updatedDislikes,
  };
}

/**
 * Inserts a record indicating that the user has seen this article,
 * preventing it from appearing in their feed again.
 *
 * @param articleId The ID of the article to mark as seen
 */
export async function markAsSeen(articleId: string): Promise<{ success: boolean }> {
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return { success: false };
  }

  // Insert seen record
  const { error } = await supabase
    .from('user_seen_articles')
    .insert({
      user_id: userId,
      article_id: articleId,
    });

  if (error && error.code !== '23505') {
    console.error('Error inserting user_seen_articles record:', error.message);
    throw new Error(`Failed to mark article as seen: ${error.message}`);
  }

  // Fetch article's subcategory and entities to update ratings
  const { data: article } = await supabase
    .from('articles')
    .select('subcategory, entities')
    .eq('id', articleId)
    .single();

  if (article) {
    const readDelta = 1;

    if (article.subcategory) {
      const { error: rpcError } = await supabase.rpc('update_user_category_rating', {
        user_id: userId,
        cat_name: article.subcategory,
        rating_delta: readDelta,
      });
      if (rpcError) {
        console.error('Error updating subcategory rating via RPC on read:', rpcError);
      }
    }

    if (Array.isArray(article.entities)) {
      for (const entity of article.entities) {
        if (entity && entity.trim()) {
          const entityKey = `entity:${entity.trim().toLowerCase()}`;
          const { error: rpcError } = await supabase.rpc('update_user_category_rating', {
            user_id: userId,
            cat_name: entityKey,
            rating_delta: readDelta,
          });
          if (rpcError) {
            console.error('Error updating entity rating via RPC on read:', rpcError);
          }
        }
      }
    }
  }

  return { success: true };
}

/**
 * Fetches the latest articles from the database, sorted strictly by creation timestamp
 * (created_at DESC) without tiered group sorting.
 *
 * @returns Pure chronological array of articles
 */
export async function getLatestFeed(searchQuery?: string): Promise<Article[]> {
  const supabase = await createClient();

  // Fetch current user session to filter out disliked articles
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  let query;

  if (searchQuery && searchQuery.trim()) {
    const cleanQuery = searchQuery.trim().toLowerCase();
    const normalizedQuery = SEARCH_ALIASES[cleanQuery] || cleanQuery;
    query = supabase.rpc('search_articles_rpc', {
      search_term: cleanQuery,
      normalized_term: normalizedQuery,
    });
  } else {
    query = supabase.from('articles').select('*');
  }

  if (userId) {
    const { data: dislikedRecords } = await supabase
      .from('user_interactions')
      .select('article_id')
      .eq('user_id', userId)
      .eq('reaction', 'dislike');

    const dislikedIds = dislikedRecords?.map((r) => r.article_id) || [];
    if (dislikedIds.length > 0) {
      query = query.not('id', 'in', `(${dislikedIds.join(',')})`);
    }
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  const articles = (data || []) as Article[];

  if (error) {
    console.error('Error fetching articles in getLatestFeed:', error);
    throw new Error(`Failed to fetch latest feed: ${error.message}`);
  }

  return articles || [];
}

/**
 * Fetches the trending articles feed.
 *
 * @returns Trending feed articles
 */
export async function getTrendingFeed(searchQuery?: string): Promise<Article[]> {
  return getFeed('all', searchQuery);
}


