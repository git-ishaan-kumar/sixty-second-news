'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Article } from '@/types/supabase';
import NewsCard from './NewsCard';
import { markAsSeen } from '@/app/actions';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';

interface FeedViewportProps {
  articles: Article[];
}

export default function FeedViewport({ articles }: FeedViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [localArticles, setLocalArticles] = useState<Article[]>(articles);

  // User category personalization ratings and session reaction states
  const [sessionRatings, setSessionRatings] = useState<Record<string, number>>({});
  const [ratedArticles, setRatedArticles] = useState<Record<string, 'like' | 'dislike'>>({});
  
  // Auth state for prompt card
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [dismissAuthPrompt, setDismissAuthPrompt] = useState(false);

  // Swipe gesture & transition states
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [containerHeight, setContainerHeight] = useState(800);

  const touchStartRef = useRef(0);
  const activeIndexRef = useRef(activeIndex);
  const isLocked = useRef(false);

  // Sync activeIndexRef for key handlers and wheel callbacks
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Load the user's category ratings client-side on mount / auth state change
  useEffect(() => {
    const fetchRatings = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setIsAuthenticated(true);
        const { data: profile } = await supabase
          .from('profiles')
          .select('category_ratings')
          .eq('id', session.user.id)
          .single();
        if (profile?.category_ratings) {
          setSessionRatings(profile.category_ratings);
        }
      } else {
        setIsAuthenticated(false);
      }
    };
    fetchRatings();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (session?.user?.id) {
        setIsAuthenticated(true);
        const { data: profile } = await supabase
          .from('profiles')
          .select('category_ratings')
          .eq('id', session.user.id)
          .single();
        if (profile?.category_ratings) {
          setSessionRatings(profile.category_ratings);
        }
      } else {
        setIsAuthenticated(false);
        setSessionRatings({});
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Update local articles list and reset states on articles changes (e.g. category change)
  useEffect(() => {
    setLocalArticles(articles);
    setActiveIndex(0);
    setDragY(0);
    setIsDragging(false);
    setIsTransitioning(false);
  }, [articles]);

  // Measure container height dynamically for transition translation calculations
  useEffect(() => {
    if (containerRef.current) {
      setContainerHeight(containerRef.current.clientHeight);
    }
    const handleResize = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mark article as seen when active index changes
  useEffect(() => {
    if (localArticles.length > 0 && localArticles[activeIndex]) {
      markAsSeen(localArticles[activeIndex].id).catch((err) => {
        console.error('Failed to mark article as seen:', err);
      });
    }
  }, [activeIndex, localArticles]);

  // Client-side ratings tracking handler
  const handleArticleReaction = useCallback((articleId: string, action: 'like' | 'unlike' | 'dislike' | 'undislike') => {
    setRatedArticles((prev) => {
      const next = { ...prev };
      if (action === 'like') {
        next[articleId] = 'like';
      } else if (action === 'dislike') {
        next[articleId] = 'dislike';
      } else {
        delete next[articleId];
      }
      return next;
    });

    const article = localArticles.find((a) => a.id === articleId);
    if (article) {
      setSessionRatings((prev) => {
        const next = { ...prev };
        const cat = article.category;
        const currentRating = next[cat] || 0;

        let delta = 0;
        if (action === 'like') {
          const prevReaction = ratedArticles[articleId];
          delta = prevReaction === 'dislike' ? 2 : 1;
        } else if (action === 'unlike') {
          delta = -1;
        } else if (action === 'dislike') {
          const prevReaction = ratedArticles[articleId];
          delta = prevReaction === 'like' ? -2 : -1;
        } else if (action === 'undislike') {
          delta = 1;
        }

        next[cat] = currentRating + delta;
        return next;
      });
    }
  }, [localArticles, ratedArticles]);

  // Algorithm: Background Array Re-Sorting of upcoming feed cards
  const reSortUpcomingArticles = useCallback((activeIdx: number, currentRated: Record<string, 'like' | 'dislike'>, currentRatings: Record<string, number>) => {
    if (activeIdx + 1 >= localArticles.length) return;

    const upcoming = localArticles.slice(activeIdx + 1);

    // Compute active affinity signals in this session
    const sessionLikes = new Set<string>();
    const sessionDislikes = new Set<string>();

    Object.entries(currentRated).forEach(([id, action]) => {
      const art = localArticles.find((a) => a.id === id);
      if (art) {
        if (action === 'like') {
          sessionLikes.add(art.category);
          if (art.subcategory) sessionLikes.add(art.subcategory);
        } else if (action === 'dislike') {
          sessionDislikes.add(art.category);
          if (art.subcategory) sessionDislikes.add(art.subcategory);
        }
      }
    });

    const isDisliked = (article: Article) => {
      const score = currentRatings[article.category] || 0;
      if (score < 0) return true;
      if (sessionDislikes.has(article.category)) return true;
      if (article.subcategory && sessionDislikes.has(article.subcategory)) return true;
      return false;
    };

    const isLiked = (article: Article) => {
      const score = currentRatings[article.category] || 0;
      if (score > 0) return true;
      if (sessionLikes.has(article.category)) return true;
      if (article.subcategory && sessionLikes.has(article.subcategory)) return true;
      return false;
    };

    const dislikedGroup: Article[] = [];
    const likedGroup: Article[] = [];
    const unratedGroup: Article[] = [];

    upcoming.forEach((art) => {
      if (isDisliked(art)) {
        dislikedGroup.push(art);
      } else if (isLiked(art)) {
        likedGroup.push(art);
      } else {
        unratedGroup.push(art);
      }
    });

    // Sort Liked Group by score (highest first), then interest_score DESC
    likedGroup.sort((a, b) => {
      const ratingA = currentRatings[a.category] || 0;
      const ratingB = currentRatings[b.category] || 0;
      if (ratingB !== ratingA) return ratingB - ratingA;
      if (b.interest_score !== a.interest_score) return b.interest_score - a.interest_score;
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });

    // Sort Unrated Group by interest_score DESC
    unratedGroup.sort((a, b) => {
      if (b.interest_score !== a.interest_score) return b.interest_score - a.interest_score;
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });

    // Sort Disliked Group by interest_score DESC
    dislikedGroup.sort((a, b) => {
      if (b.interest_score !== a.interest_score) return b.interest_score - a.interest_score;
      return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
    });

    // Blending algorithm for High Discovery: 2 Liked articles to 1 Unrated article
    const blended: Article[] = [];
    let likedIdx = 0;
    let unratedIdx = 0;

    while (likedIdx < likedGroup.length || unratedIdx < unratedGroup.length) {
      for (let i = 0; i < 2 && likedIdx < likedGroup.length; i++) {
        blended.push(likedGroup[likedIdx++]);
      }
      if (unratedIdx < unratedGroup.length) {
        blended.push(unratedGroup[unratedIdx++]);
      }
    }

    const sortedUpcoming = [...blended, ...dislikedGroup];

    setLocalArticles((prev) => {
      const next = [...prev];
      next.splice(activeIdx + 1, sortedUpcoming.length, ...sortedUpcoming);
      return next;
    });
  }, [localArticles]);

  // Hook triggered past swiping rated cards
  const handlePostSwipeActions = useCallback((oldIndex: number, newIndex: number) => {
    const oldArticle = localArticles[oldIndex];
    if (oldArticle) {
      if (ratedArticles[oldArticle.id]) {
        reSortUpcomingArticles(newIndex, ratedArticles, sessionRatings);
      }
    }
  }, [localArticles, ratedArticles, sessionRatings, reSortUpcomingArticles]);

  const triggerSwipe = useCallback((direction: 'next' | 'prev') => {
    if (isTransitioning || localArticles.length <= 1) return;
    
    // Boundary check: prevent navigating to the previous card if we are on the first item
    if (direction === 'prev' && activeIndexRef.current === 0) return;

    setIsTransitioning(true);
    isLocked.current = true;

    const targetDragY = direction === 'next' ? -containerHeight : containerHeight;
    setDragY(targetDragY);

    setTimeout(() => {
      setIsTransitioning(false);
      setDragY(0);
      isLocked.current = false;

      const oldIndex = activeIndexRef.current;
      const newIndex = direction === 'next'
        ? (oldIndex + 1) % localArticles.length
        : (oldIndex - 1 + localArticles.length) % localArticles.length;

      handlePostSwipeActions(oldIndex, newIndex);
      setActiveIndex(newIndex);
    }, 400);
  }, [containerHeight, localArticles.length, isTransitioning, handlePostSwipeActions]);

  // Mouse wheel / keyboard callbacks
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 15) return;
      e.preventDefault();

      if (isLocked.current || isTransitioning) return;
      const direction = e.deltaY > 0 ? 'next' : 'prev';
      triggerSwipe(direction);
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isLocked.current && !isTransitioning) {
          triggerSwipe('next');
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isLocked.current && !isTransitioning) {
          triggerSwipe('prev');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [triggerSwipe, isTransitioning]);

  // Touch handlers for mobile swipe drag gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    if (isTransitioning || localArticles.length <= 1) return;
    setIsDragging(true);
    touchStartRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isTransitioning || localArticles.length <= 1) return;
    const currentY = e.touches[0].clientY;
    let deltaY = currentY - touchStartRef.current;

    // Boundary check: prevent swipe down (positive deltaY) on the first card
    if (activeIndex === 0 && deltaY > 0) {
      deltaY = 0;
    }

    setDragY(deltaY);
  };

  const handleTouchEnd = () => {
    if (!isDragging || isTransitioning || localArticles.length <= 1) return;
    setIsDragging(false);

    const threshold = containerHeight * 0.15; // 15% threshold
    if (dragY < -threshold) {
      triggerSwipe('next');
    } else if (dragY > threshold) {
      triggerSwipe('prev');
    } else {
      setIsTransitioning(true);
      setDragY(0);
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    }
  };

  if (!localArticles || localArticles.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-slate select-none p-4 h-[calc(100vh-57px)] bg-[#16161A]">
        <div className="text-center font-tiktok-sans">
          <div className="text-4xl mb-2">📰</div>
          <p className="text-sm font-medium text-pure-white/80">No articles available.</p>
          <p className="text-xs text-muted-slate mt-1">Please select another category or check back later.</p>
        </div>
      </div>
    );
  }

  // Pre-fetching pointers for the circular queue stack
  const prevIndex = (activeIndex - 1 + localArticles.length) % localArticles.length;
  const nextIndex = (activeIndex + 1) % localArticles.length;

  const currentArticle = localArticles[activeIndex];
  const prevArticle = (localArticles.length > 1 && activeIndex !== 0) ? localArticles[prevIndex] : null;
  const nextArticle = localArticles.length > 1 ? localArticles[nextIndex] : null;

  // Transform mechanics and progress math
  const progress = Math.min(1, Math.abs(dragY) / containerHeight);

  const transitionStyle = isTransitioning
    ? 'transform 400ms cubic-bezier(0.25, 1, 0.5, 1), opacity 400ms cubic-bezier(0.25, 1, 0.5, 1)'
    : 'none';

  // Front Active card layout style properties
  const activeCardStyle: React.CSSProperties = {
    transition: transitionStyle,
    transform: `translateY(${dragY}px)`,
    opacity: 1,
    zIndex: 20,
  };

  // Next queued card layout style properties (prepared to slide up from below)
  const nextCardStyle: React.CSSProperties = {
    transition: transitionStyle,
    transform: `translateY(${containerHeight + dragY}px)`,
    opacity: 1,
    zIndex: 20,
  };

  // Previous card layout style properties (prepared to slide down from above)
  const prevCardStyle: React.CSSProperties = {
    transition: transitionStyle,
    transform: `translateY(${-containerHeight + dragY}px)`,
    opacity: 1,
    zIndex: 20,
  };

  return (
    <div className="flex-1 w-full flex justify-center bg-[#16161A] overflow-hidden relative">
      {/* Interaction Card Stack Layer */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full max-w-[450px] md:max-w-[480px] relative overflow-hidden flex flex-col justify-center items-center select-none"
        style={{
          height: 'calc(100vh - 57px)',
          touchAction: 'none', // Block standard browser gestures
        }}
      >
        {prevArticle && (
          <div
            key={`prev-${prevArticle.id}`}
            style={prevCardStyle}
            className="absolute inset-0 w-full h-full flex items-center justify-center p-0 md:p-4 pointer-events-none"
          >
            <div className="w-full h-full pointer-events-auto">
              <NewsCard article={prevArticle} onReact={handleArticleReaction} />
            </div>
          </div>
        )}

        <div
          key={`active-${currentArticle.id}`}
          style={activeCardStyle}
          className="absolute inset-0 w-full h-full flex items-center justify-center p-0 md:p-4 z-20"
        >
          <NewsCard article={currentArticle} onReact={handleArticleReaction} />
        </div>

        {nextArticle && (
          <div
            key={`next-${nextArticle.id}`}
            style={nextCardStyle}
            className="absolute inset-0 w-full h-full flex items-center justify-center p-0 md:p-4 pointer-events-none"
          >
            <div className="w-full h-full pointer-events-auto">
              <NewsCard article={nextArticle} onReact={handleArticleReaction} />
            </div>
          </div>
        )}
      </div>

      {/* Onboarding Prompt Overlay */}
      {isAuthenticated === false && !dismissAuthPrompt && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] md:w-[85%] max-w-3xl bg-[#16161A] rounded-2xl p-6 md:p-8 border border-[#9CA3AF]/20 z-[100] shadow-2xl flex flex-col md:flex-row items-center gap-6 md:gap-8 animate-in fade-in zoom-in-95 font-tiktok-sans">
          <button 
            onClick={() => setDismissAuthPrompt(true)}
            className="absolute top-4 right-4 text-[#9CA3AF] hover:text-[#FFFFFF] transition-colors p-1"
            aria-label="Dismiss"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          <div className="flex-1 w-full mt-2 md:mt-0">
            <h3 className="text-2xl md:text-3xl font-bold text-[#FFFFFF] mb-4">Unlock Your Feed</h3>
            <ul className="text-sm md:text-base text-[#FFFFFF]/80 space-y-3 font-medium">
              <li className="flex items-start gap-2">
                <span className="mt-1 text-inherit">•</span>
                <span>Get a personalized mix based on your favorite categories.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-inherit">•</span>
                <span>Automatically hide headlines you’ve already seen.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 text-inherit">•</span>
                <span>Like, dislike, and discover new content seamlessly.</span>
              </li>
            </ul>
          </div>
          
          <div className="flex flex-col gap-3 w-full md:w-56 mt-2 md:mt-0 shrink-0">
            <Link href="/signup" className="w-full bg-[#2F80ED] hover:bg-hyper-blue/90 text-[#FFFFFF] py-3 px-4 rounded-xl text-center font-semibold text-sm transition-colors shadow-lg">
              Register
            </Link>
            <Link href="/login" className="w-full bg-[#16161A] border border-[#9CA3AF]/40 hover:bg-white/10 text-[#FFFFFF] py-3 px-4 rounded-xl text-center font-semibold text-sm transition-colors">
              Log In
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
