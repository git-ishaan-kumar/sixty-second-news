import React, { Suspense } from 'react';
import CategoryBar from '../components/layout/CategoryBar';
import FeedViewport from '../components/feed/FeedViewport';
import { createClient } from '../utils/supabase/server';
import { getFeed, getPersonalizedFeed } from './actions';
import { Article } from '@/types/supabase';
import { searchArticles } from '@/utils/search';

interface HomeProps {
  searchParams: Promise<{ category?: string; search?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const supabase = await createClient();
  let initialUser = null;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    initialUser = session?.user ?? null;
  } catch (err) {
    console.error('Error fetching session in Home:', err);
  }

  const parsedParams = await searchParams;
  const selectedCategory = parsedParams.category;
  const searchQuery = parsedParams.search;

  // Determine feed sorting and fetching logic
  let articles: Article[] = [];
  try {
    if (initialUser && (!selectedCategory || selectedCategory === 'for_you')) {
      articles = await getPersonalizedFeed(initialUser.id, searchQuery);
    } else {
      const categoryParam = selectedCategory === 'all' || !selectedCategory ? 'all' : selectedCategory;
      articles = await getFeed(categoryParam, searchQuery);
    }

    if (searchQuery) {
      articles = searchArticles(articles, searchQuery);
    }
  } catch (feedErr) {
    console.error('Failed to load feed data:', feedErr);
  }

  return (
    <div className="flex-1 flex flex-col bg-[#16161A]">
      {/* Horizontal Category Pill Bar */}
      <Suspense fallback={<div className="w-full h-[57px] bg-[#16161a] border-b border-muted-slate/10" />}>
        <CategoryBar initialUser={initialUser} />
      </Suspense>
      
      {/* Interactive TikTok-style full-page snap scroll feed */}
      <FeedViewport articles={articles} />
    </div>
  );
}
