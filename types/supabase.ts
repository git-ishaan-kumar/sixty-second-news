export type NewsCategory =
  | 'politics_government'
  | 'economy_business_finance'
  | 'science_technology'
  | 'sport'
  | 'arts_culture_entertainment'
  | 'crime_law_justice'
  | 'environment';

export interface CategoryRatings {
  politics_government: number;
  economy_business_finance: number;
  science_technology: number;
  sport: number;
  arts_culture_entertainment: number;
  crime_law_justice: number;
  environment: number;
  [key: string]: number; // Allow string index access for dynamic rating mutations
}

export interface Profile {
  id: string; // uuid referencing auth.users
  username: string;
  email: string;
  category_ratings: CategoryRatings;
  created_at: string; // timestamp with timezone
}

export interface Article {
  id: string; // uuid
  category: NewsCategory;
  subcategory: string;
  entities?: string[] | null;
  interest_score: number;
  title: string;
  description: string;
  image: string | null;
  source_url: string; // unique URL to prevent duplicates
  published_at: string; // timestamp with timezone
  likes: number; // default 0
  dislikes: number; // default 0
  created_at: string; // timestamp with timezone
}

export const CATEGORIES: NewsCategory[] = [
  'politics_government',
  'economy_business_finance',
  'science_technology',
  'sport',
  'arts_culture_entertainment',
  'crime_law_justice',
  'environment',
];

export const DEFAULT_CATEGORY_RATINGS: CategoryRatings = {
  politics_government: 0,
  economy_business_finance: 0,
  science_technology: 0,
  sport: 0,
  arts_culture_entertainment: 0,
  crime_law_justice: 0,
  environment: 0,
};
