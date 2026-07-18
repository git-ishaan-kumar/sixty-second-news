'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Article } from '@/types/supabase';
import NewsCard from './NewsCard';
import { markAsSeen } from '@/app/actions';

interface FeedViewportProps {
  articles: Article[];
}

export default function FeedViewport({ articles }: FeedViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isLocked = useRef(false);

  // Keep activeIndex ref synced for the event listener closures
  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  // Reset feed viewport state on articles / category changes
  useEffect(() => {
    setActiveIndex(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [articles]);

  // Mark article as seen when active index changes
  useEffect(() => {
    if (articles.length > 0 && articles[activeIndex]) {
      markAsSeen(articles[activeIndex].id).catch((err) => {
        console.error('Failed to mark article as seen:', err);
      });
    }
  }, [activeIndex, articles]);

  const scrollToIndex = useCallback((index: number) => {
    if (!containerRef.current || articles.length === 0) return;

    // Hard bounds check: clamp to array bounds
    if (index < 0 || index >= articles.length) return;

    if (isLocked.current) return;
    isLocked.current = true;

    setActiveIndex(index);

    const container = containerRef.current;
    const cardElement = container.children[index] as HTMLElement;
    if (cardElement) {
      container.scrollTo({
        top: cardElement.offsetTop,
        behavior: 'smooth',
      });
    }

    // Lock duration to block subsequent rapid wheel spins (momentum overswipe prevention)
    setTimeout(() => {
      isLocked.current = false;
    }, 700); // 700ms matches the smooth scroll duration
  }, [articles.length]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Handle mouse wheel scrolling for desktop (momentum/overswipe locking)
    const handleWheel = (e: WheelEvent) => {
      // Only lock wheel scroll if there's significant vertical scroll input
      if (Math.abs(e.deltaY) < 15) return;

      e.preventDefault();

      if (isLocked.current) return;

      const direction = e.deltaY > 0 ? 1 : -1;
      scrollToIndex(activeIndexRef.current + direction);
    };

    // Listen with passive: false so we can preventDefault
    container.addEventListener('wheel', handleWheel, { passive: false });

    // Handle keyboard arrow keys
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollToIndex(activeIndexRef.current + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollToIndex(activeIndexRef.current - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [scrollToIndex]);

  // Sync state if user uses mobile native touch swiping or browser scrolls natively
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container || isLocked.current) return;

    // Determine current index based on scroll position
    const scrollTop = container.scrollTop;
    const childHeight = container.clientHeight;
    if (childHeight > 0) {
      const index = Math.round(scrollTop / childHeight);
      if (index !== activeIndex && index >= 0 && index < articles.length) {
        setActiveIndex(index);
      }
    }
  };

  if (!articles || articles.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-slate select-none p-4 h-[calc(100vh-57px)]">
        <div className="text-center font-tiktok-sans">
          <div className="text-4xl mb-2">📰</div>
          <p className="text-sm font-medium text-pure-white/80">No articles available.</p>
          <p className="text-xs text-muted-slate mt-1">Please select another category or check back later.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full flex justify-center bg-[#16161A] overflow-hidden">
      {/* Scrollable Feed Viewport */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full max-w-[450px] md:max-w-[480px] overflow-y-auto scroll-smooth snap-y snap-mandatory scrollbar-none flex flex-col"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          height: 'calc(100vh - 57px)', // Fill viewport height below category bar
        }}
      >
        {articles.map((article) => (
          <div
            key={article.id}
            className="w-full flex-shrink-0 snap-start snap-always flex items-center justify-center p-0 md:p-4"
            style={{ height: 'calc(100vh - 57px)' }}
          >
            <NewsCard article={article} />
          </div>
        ))}
      </div>
    </div>
  );
}
