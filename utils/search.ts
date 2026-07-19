import { Article } from '@/types/supabase';

function cleanString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function getLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function isTokenMatch(queryToken: string, targetToken: string): boolean {
  if (targetToken.includes(queryToken) || queryToken.includes(targetToken)) {
    return true;
  }

  // Typo tolerance Levenshtein check:
  // For short tokens (<= 4 chars), allow max 1 edit distance.
  // For longer tokens (> 4 chars), allow max 2 edit distances.
  const distance = getLevenshteinDistance(queryToken, targetToken);
  const maxAllowedDistance = queryToken.length > 4 ? 2 : 1;

  return distance <= maxAllowedDistance;
}

/**
 * Filters articles based on a fuzzy search query. Match ignoring casing, multiple whitespace,
 * spelling typos, and plural terms.
 *
 * @param articles List of articles to filter
 * @param query Search query text
 * @returns Filtered list of articles matching the search criteria
 */
export function searchArticles(articles: Article[], query: string): Article[] {
  if (!query || !query.trim()) return articles;

  const cleanedQuery = cleanString(query);
  const queryTokens = cleanedQuery.split(" ").filter(Boolean);

  if (queryTokens.length === 0) return articles;

  return articles.filter((article) => {
    // Combine text fields from article to search within
    const textToSearch = cleanString(
      `${article.title} ${article.description} ${article.category || ""} ${article.subcategory || ""}`
    );
    const targetTokens = textToSearch.split(" ").filter(Boolean);

    // Every token in the query must match at least one token in the article
    return queryTokens.every((qToken) => {
      const singularQ = qToken.endsWith("s") ? qToken.slice(0, -1) : qToken;
      const pluralQ = qToken + "s";

      return targetTokens.some((tToken) => {
        const singularT = tToken.endsWith("s") ? tToken.slice(0, -1) : tToken;

        return (
          isTokenMatch(qToken, tToken) ||
          isTokenMatch(singularQ, tToken) ||
          isTokenMatch(qToken, singularT) ||
          isTokenMatch(pluralQ, tToken)
        );
      });
    });
  });
}
