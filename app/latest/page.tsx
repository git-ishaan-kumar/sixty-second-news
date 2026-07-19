import React, { Suspense } from 'react';
import CategoryBar from '../../components/layout/CategoryBar';
import FeedViewport from '../../components/feed/FeedViewport';
import { createClient } from '../../utils/supabase/server';
import { getLatestFeed } from '../actions';
import { Article } from '@/types/supabase';
import { searchArticles } from '../../utils/search';

interface LatestPageProps {
  searchParams: Promise<{ search?: string }>;
}

export default async function LatestPage({ searchParams }: LatestPageProps) {
  const supabase = await createClient();
  let initialUser = null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    initialUser = session?.user ?? null;
  } catch (err) {
    console.error('Error fetching session in LatestPage:', err);
  }

  const parsedParams = await searchParams;
  const searchQuery = parsedParams.search;

  let articles: Article[] = [];
  try {
    articles = await getLatestFeed(searchQuery);
    if (searchQuery) {
      articles = searchArticles(articles, searchQuery);
    }
  } catch (feedErr) {
    console.error('Failed to load latest feed data:', feedErr);
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
