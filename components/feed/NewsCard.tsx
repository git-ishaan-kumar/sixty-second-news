'use client';

import React, { useState, useEffect } from 'react';
import { Article } from '@/types/supabase';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useInteractions } from './InteractionContext';

interface NewsCardProps {
  article: Article;
  onReact?: (articleId: string, action: 'like' | 'unlike' | 'dislike' | 'undislike') => void;
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

// SVG External Link Icon
const ExternalLinkIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5 transition-transform duration-300"
  >
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

// SVG Share Icon
const ShareIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-5 h-5 transition-transform duration-300"
  >
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);

export default function NewsCard({ article, onReact }: NewsCardProps) {
  const { title, description, image, category, subcategory, source_url, published_at, likes, dislikes } = article;

  // Format subcategory replacing underscores with spaces
  const formattedSubcategory = subcategory ? subcategory.replace(/_/g, ' ') : '';

  // Client-side authentication state
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { likedArticleIds, dislikedArticleIds, articleLikes, articleDislikes, toggleLike, toggleDislike } = useInteractions();

  const hasLiked = likedArticleIds.has(article.id);
  const hasDisliked = dislikedArticleIds.has(article.id);
  const likeCount = articleLikes[article.id] ?? likes;
  const dislikeCount = articleDislikes[article.id] ?? dislikes;
  const [copiedToast, setCopiedToast] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: description,
          url: source_url,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.log('Error sharing:', err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(source_url);
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2000);
      } catch (copyErr) {
        console.error('Failed to copy link:', copyErr);
      }
    }
  };

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
    await toggleLike(article.id, likes, dislikes, onReact);
  };

  const handleDislike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleDislike(article.id, likes, dislikes, onReact);
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
      <div className="absolute right-4 md:right-6 bottom-20 md:bottom-24 z-30 flex flex-col items-center gap-4">
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

        {/* Web Share API Button */}
        <div className="flex flex-col items-center gap-1 relative">
          <button
            onClick={handleShare}
            title="Share Article"
            aria-label="Share this article"
            className="w-12 h-12 rounded-full flex items-center justify-center border border-white/10 bg-black/40 text-pure-white hover:bg-black/60 hover:border-white/25 hover:scale-105 transition-all duration-300 shadow-lg cursor-pointer backdrop-blur-md"
          >
            <ShareIcon />
          </button>
          <span className="font-montserrat text-[10px] font-bold text-pure-white/90 drop-shadow-md select-none uppercase tracking-wider">
            Share
          </span>

          {/* Copy Toast Notification */}
          {copiedToast && (
            <div className="absolute right-14 top-1/2 -translate-y-1/2 whitespace-nowrap bg-hyper-blue text-pure-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl animate-in fade-in slide-in-from-right-2 duration-200 pointer-events-none z-50">
              Link copied!
            </div>
          )}
        </div>

        {/* Visit External Source Button */}
        <div className="flex flex-col items-center gap-1">
          <a
            href={source_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Visit Source"
            aria-label="Visit article source"
            className="w-12 h-12 rounded-full flex items-center justify-center border border-white/10 bg-black/40 text-pure-white hover:bg-black/60 hover:border-white/25 hover:scale-105 transition-all duration-300 shadow-lg cursor-pointer backdrop-blur-md"
          >
            <ExternalLinkIcon />
          </a>
          <span className="font-montserrat text-[10px] font-bold text-pure-white/90 drop-shadow-md select-none uppercase tracking-wider">
            Source
          </span>
        </div>
      </div>
    </div>
  );
}
