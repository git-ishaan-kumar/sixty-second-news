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

  // Auth state for prompt card
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [dismissAuthPrompt, setDismissAuthPrompt] = useState(false);

  // Swipe gesture & transition states
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [containerHeight, setContainerHeight] = useState(800);

  // PWA Install Banner states
  const [shouldRenderBanner, setShouldRenderBanner] = useState(false);
  const [hasMetScrollTrigger, setHasMetScrollTrigger] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosTooltip, setShowIosTooltip] = useState(false);

  // Monitor activeIndex to set scroll trigger (past 3 articles)
  useEffect(() => {
    if (activeIndex >= 3) {
      setHasMetScrollTrigger(true);
    }
  }, [activeIndex]);

  // PWA & Mobile check
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    const isDismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';

    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    if (isMobile && !isInstalled && !isDismissed) {
      if (hasMetScrollTrigger) {
        setShouldRenderBanner(true);
      }

      // Listen for prompt on Android / Chrome
      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    } else {
      setShouldRenderBanner(false);
    }
  }, [hasMetScrollTrigger]);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosTooltip((prev) => !prev);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    setDeferredPrompt(null);
    setShouldRenderBanner(false);
  };

  const handleDismissBanner = () => {
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
    setShouldRenderBanner(false);
  };

  const touchStartRef = useRef(0);
  const activeIndexRef = useRef(activeIndex);
  const isLocked = useRef(false);

  // Sync activeIndexRef for key handlers and wheel callbacks
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Check auth state for onboarding overlay
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session?.user?.id);
    };
    checkAuth();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session?.user?.id);
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

  // Client-side ratings tracking handler (sorting is disabled during active session)
  const handleArticleReaction = useCallback((articleId: string, action: 'like' | 'unlike' | 'dislike' | 'undislike') => {
    // Stable feed order during session: no dynamic re-ordering of local articles array
  }, []);
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

      setActiveIndex(newIndex);
    }, 400);
  }, [containerHeight, localArticles.length, isTransitioning]);

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

      {/* PWA top install banner */}
      <div className={`fixed top-0 left-0 right-0 z-[9999] bg-[#16161A]/95 backdrop-blur-md border-b border-muted-slate/10 px-4 py-3 flex items-center justify-between shadow-2xl transition-transform duration-500 ease-out font-montserrat ${
        shouldRenderBanner ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="flex items-center gap-3">
          <img
            src="/apple-touch-icon.png"
            alt="60s News Logo"
            className="w-10 h-10 rounded-xl flex-shrink-0 shadow-md shadow-hyper-blue/20"
          />
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-pure-white leading-tight">60s News</span>
            <span className="text-[10px] font-semibold text-muted-slate leading-normal">
              Add 60s News to your Home Screen
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleInstallClick}
            className="bg-hyper-blue hover:bg-blue-600 active:scale-95 text-pure-white text-xs font-bold py-1.5 px-4 rounded-lg transition-all shadow-md cursor-pointer"
          >
            Install
          </button>
          
          <button
            onClick={handleDismissBanner}
            className="text-muted-slate hover:text-pure-white p-1 transition-colors cursor-pointer"
            aria-label="Dismiss"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* iOS Tooltip Bubble */}
        {showIosTooltip && (
          <div className="absolute top-[calc(100%+8px)] right-4 z-[10000] w-[260px] bg-[#16161A] border border-hyper-blue p-3.5 rounded-xl shadow-2xl text-left animate-fadeIn">
            <p className="text-xs font-semibold text-pure-white leading-relaxed">
              To install: tap the browser's <span className="text-hyper-blue font-bold">Share</span> icon then select <span className="text-hyper-blue font-bold">Add to Home Screen</span>.
            </p>
            {/* Arrow caret pointing up towards the Install button */}
            <div className="absolute bottom-full right-16 border-x-6 border-x-transparent border-b-6 border-b-hyper-blue" />
          </div>
        )}
      </div>
    </div>
  );
}
