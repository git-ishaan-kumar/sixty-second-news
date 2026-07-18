'use client';

import React, { useState } from 'react';
import { Article } from '@/types/supabase';
import { mutateArticleReaction } from '@/app/actions';

interface NewsCardProps {
  article: Article;
}

// Subtle, unique gradient background specific to each of the 7 categories
const categoryGradients: Record<string, string> = {
  politics_government: 'from-[#4A0E17] via-[#2E0854] to-[#16161A]',
  economy_business_finance: 'from-[#0A3D2A] via-[#102A43] to-[#16161A]',
  science_technology: 'from-[#1F1C2C] via-[#101014] to-[#16161A]',
  sport: 'from-[#451e01] via-[#1c0a00] to-[#16161A]',
  arts_culture_entertainment: 'from-[#5A0E2D] via-[#2D0B3D] to-[#16161A]',
  crime_law_justice: 'from-[#111827] via-[#1F2937] to-[#16161A]',
  environment: 'from-[#0B2516] via-[#1C2E1F] to-[#16161A]',
  default: 'from-slate-900 via-zinc-900 to-[#16161A]',
};

const categoryLabels: Record<string, string> = {
  politics_government: 'Politics',
  economy_business_finance: 'Business',
  science_technology: 'Technology',
  sport: 'Sports',
  arts_culture_entertainment: 'Entertainment',
  crime_law_justice: 'Justice',
  environment: 'Environment',
};

// SVG Thumbs Up Icon
const ThumbsUpIcon = ({ filled }: { filled: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5 transition-transform duration-300"
  >
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

// SVG Thumbs Down Icon
const ThumbsDownIcon = ({ filled }: { filled: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5 transition-transform duration-300"
  >
    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17" />
  </svg>
);

export default function NewsCard({ article }: NewsCardProps) {
  const { title, description, image, category, subcategory, source_url, published_at, likes, dislikes } = article;

  // Format subcategory replacing underscores with spaces
  const formattedSubcategory = subcategory ? subcategory.replace(/_/g, ' ') : '';

  // Local state for optimistic UI updates
  const [hasLiked, setHasLiked] = useState(false);
  const [hasDisliked, setHasDisliked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);
  const [dislikeCount, setDislikeCount] = useState(dislikes);

  // Intercept image and check if it has a valid source or starts with PLACEHOLDER_
  const isPlaceholder = !image || image.startsWith('PLACEHOLDER_') || image === 'None';
  const gradientClass = categoryGradients[category] || categoryGradients.default;
  const displayCategory = categoryLabels[category] || category;

  // Get domain name from URL for cleaner source display
  const getDomain = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace('www.', '');
    } catch {
      return 'News Source';
    }
  };

  const domain = getDomain(source_url);

  // Get relative time from published date
  const getRelativeTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) {
        return `${Math.max(1, diffMins)}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else {
        return `${diffDays}d ago`;
      }
    } catch {
      return '';
    }
  };

  const formattedTime = getRelativeTime(published_at);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Snapshot previous state for rollback on error
    const prevHasLiked = hasLiked;
    const prevHasDisliked = hasDisliked;
    const prevLikeCount = likeCount;
    const prevDislikeCount = dislikeCount;

    // 2. Perform optimistic updates instantly
    if (hasLiked) {
      setHasLiked(false);
      setLikeCount((prev) => Math.max(0, prev - 1));
    } else {
      setHasLiked(true);
      setLikeCount((prev) => prev + 1);
      if (hasDisliked) {
        setHasDisliked(false);
        setDislikeCount((prev) => Math.max(0, prev - 1));
      }
    }

    try {
      // 3. Dispatch mutations to the backend server action
      if (prevHasLiked) {
        // Was liked, now unliking
        const result = await mutateArticleReaction(article.id, 'unlike');
        if (result?.success) {
          setLikeCount(result.likes);
          setDislikeCount(result.dislikes);
        }
      } else {
        // Was not liked, now liking
        if (prevHasDisliked) {
          // If it was disliked, undislike first to correct counts/personalization scores
          await mutateArticleReaction(article.id, 'undislike');
        }
        const result = await mutateArticleReaction(article.id, 'like');
        if (result?.success) {
          setLikeCount(result.likes);
          setDislikeCount(result.dislikes);
        }
      }
    } catch (err) {
      console.error('Optimistic UI rollback - Like action failed:', err);
      // 4. Rollback to previous state on failure
      setHasLiked(prevHasLiked);
      setHasDisliked(prevHasDisliked);
      setLikeCount(prevLikeCount);
      setDislikeCount(prevDislikeCount);
    }
  };

  const handleDislike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 1. Snapshot previous state for rollback on error
    const prevHasLiked = hasLiked;
    const prevHasDisliked = hasDisliked;
    const prevLikeCount = likeCount;
    const prevDislikeCount = dislikeCount;

    // 2. Perform optimistic updates instantly
    if (hasDisliked) {
      setHasDisliked(false);
      setDislikeCount((prev) => Math.max(0, prev - 1));
    } else {
      setHasDisliked(true);
      setDislikeCount((prev) => prev + 1);
      if (hasLiked) {
        setHasLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      }
    }

    try {
      // 3. Dispatch mutations to the backend server action
      if (prevHasDisliked) {
        // Was disliked, now undisliking
        const result = await mutateArticleReaction(article.id, 'undislike');
        if (result?.success) {
          setLikeCount(result.likes);
          setDislikeCount(result.dislikes);
        }
      } else {
        // Was not disliked, now disliking
        if (prevHasLiked) {
          // If it was liked, unlike first to correct counts/personalization scores
          await mutateArticleReaction(article.id, 'unlike');
        }
        const result = await mutateArticleReaction(article.id, 'dislike');
        if (result?.success) {
          setLikeCount(result.likes);
          setDislikeCount(result.dislikes);
        }
      }
    } catch (err) {
      console.error('Optimistic UI rollback - Dislike action failed:', err);
      // 4. Rollback to previous state on failure
      setHasLiked(prevHasLiked);
      setHasDisliked(prevHasDisliked);
      setLikeCount(prevLikeCount);
      setDislikeCount(prevDislikeCount);
    }
  };

  return (
    <div className="relative w-full h-full rounded-none border-none md:max-w-md md:aspect-[9/16] md:rounded-2xl md:border md:border-white/10 md:shadow-2xl group bg-[#16161A] overflow-hidden flex flex-col">
      {/* Clickable News Card Link */}
      <a
        href={source_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full h-full relative select-none outline-none flex-1"
      >
        {/* Background Media Layer */}
        {isPlaceholder ? (
          <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass} w-full h-full transition-transform duration-700 ease-out group-hover:scale-105`} />
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        )}

        {/* Dark Vignette Overlay for Premium Styling & High-Contrast Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#16161A] via-black/45 to-black/20 z-10" />

        {/* Content Overlay Container (pr-20 prevents text overlapping with interaction buttons) */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 md:p-10 pr-20 md:pr-24 text-pure-white gap-3.5">
          <div className="flex flex-col gap-1.5">
            {/* Category • Subcategory Sleek Minimalist Header */}
            <div className="text-[10px] md:text-xs font-tiktok-sans font-bold uppercase tracking-widest text-muted-slate/75 flex items-center gap-1.5 select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)]">
              <span>{displayCategory}</span>
              {formattedSubcategory && (
                <>
                  <span className="text-muted-slate/40">•</span>
                  <span>{formattedSubcategory}</span>
                </>
              )}
            </div>

            {/* Article Hook Title - Wrap dynamically, no line-clamp */}
            <h2 className="font-montserrat font-extrabold text-2xl md:text-3xl leading-snug tracking-tight text-pure-white drop-shadow-[0_3px_8px_rgba(0,0,0,1.0)]">
              {title}
            </h2>
          </div>

          {/* Article Hook Description - Wrap dynamically, no line-clamp */}
          <p className="font-tiktok-sans font-normal text-sm md:text-base text-muted-slate leading-relaxed drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]">
            {description}
          </p>

          {/* Source Branding Metadata - Offset with top margin for safety gap */}
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-slate/60 mt-1 drop-shadow-[0_1.5px_3px_rgba(0,0,0,0.95)]">
            <span>{domain}</span>
            {formattedTime && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-muted-slate/30" />
                <span>{formattedTime}</span>
              </>
            )}
          </div>
        </div>
      </a>

      {/* Floating Interaction Buttons Layer (positioned on the right edge, z-30 overlays card) */}
      <div className="absolute right-4 md:right-6 bottom-24 md:bottom-28 z-30 flex flex-col items-center gap-5">
        {/* Like (Thumbs Up) Button */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleLike}
            aria-label="Like this article"
            className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 shadow-lg cursor-pointer backdrop-blur-md ${
              hasLiked
                ? 'bg-hyper-blue border-hyper-blue text-pure-white shadow-hyper-blue/30 scale-105'
                : 'bg-black/40 border-white/10 text-pure-white hover:bg-black/60 hover:border-white/25 hover:scale-105'
            }`}
          >
            <ThumbsUpIcon filled={hasLiked} />
          </button>
          <span className="font-montserrat text-xs font-bold text-pure-white/90 drop-shadow-md select-none">
            {likeCount}
          </span>
        </div>

        {/* Dislike (Thumbs Down) Button */}
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={handleDislike}
            aria-label="Dislike this article"
            className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all duration-300 shadow-lg cursor-pointer backdrop-blur-md ${
              hasDisliked
                ? 'bg-rose-600 border-rose-600 text-pure-white shadow-rose-600/30 scale-105'
                : 'bg-black/40 border-white/10 text-pure-white hover:bg-black/60 hover:border-white/25 hover:scale-105'
            }`}
          >
            <ThumbsDownIcon filled={hasDisliked} />
          </button>
          <span className="font-montserrat text-xs font-bold text-pure-white/90 drop-shadow-md select-none">
            {dislikeCount}
          </span>
        </div>
      </div>
    </div>
  );
}
