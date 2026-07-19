import React, { Suspense } from 'react';
import CategoryBar from '../../components/layout/CategoryBar';
import FeedViewport from '../../components/feed/FeedViewport';
import { createClient } from '../../utils/supabase/server';
import { getTrendingFeed } from '../actions';
import { Article } from '@/types/supabase';

export default async function TrendingPage() {
  const supabase = await createClient();
  let initialUser = null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    initialUser = session?.user ?? null;
  } catch (err) {
    console.error('Error fetching session in TrendingPage:', err);
  }

  let articles: Article[] = [];
  try {
    articles = await getTrendingFeed();
  } catch (feedErr) {
    console.error('Failed to load trending feed data:', feedErr);
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
