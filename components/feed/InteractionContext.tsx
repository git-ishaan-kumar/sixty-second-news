'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getUserReactions, mutateArticleReaction } from '@/app/actions';
import { useRouter } from 'next/navigation';

interface InteractionContextType {
  likedArticleIds: Set<string>;
  dislikedArticleIds: Set<string>;
  articleLikes: Record<string, number>; // articleId -> likes count
  articleDislikes: Record<string, number>; // articleId -> dislikes count
  toggleLike: (
    articleId: string,
    initialLikes: number,
    initialDislikes: number,
    onReact?: (articleId: string, action: 'like' | 'unlike' | 'dislike' | 'undislike') => void
  ) => Promise<void>;
  toggleDislike: (
    articleId: string,
    initialLikes: number,
    initialDislikes: number,
    onReact?: (articleId: string, action: 'like' | 'unlike' | 'dislike' | 'undislike') => void
  ) => Promise<void>;
  loading: boolean;
}

const InteractionContext = createContext<InteractionContextType | undefined>(undefined);

export function useInteractions() {
  const context = useContext(InteractionContext);
  if (!context) {
    throw new Error('useInteractions must be used within an InteractionProvider');
  }
  return context;
}

export function InteractionProvider({ children }: { children: React.ReactNode }) {
  const [likedArticleIds, setLikedArticleIds] = useState<Set<string>>(new Set());
  const [dislikedArticleIds, setDislikedArticleIds] = useState<Set<string>>(new Set());
  const [articleLikes, setArticleLikes] = useState<Record<string, number>>({});
  const [articleDislikes, setArticleDislikes] = useState<Record<string, number>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const loadReactions = async (uid: string) => {
      setLoading(true);
      try {
        const { likedArticleIds: liked, dislikedArticleIds: disliked } = await getUserReactions();
        setLikedArticleIds(new Set(liked));
        setDislikedArticleIds(new Set(disliked));
      } catch (err) {
        console.error('Failed to load user reactions:', err);
      } finally {
        setLoading(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        loadReactions(uid);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        loadReactions(uid);
      } else {
        setLikedArticleIds(new Set());
        setDislikedArticleIds(new Set());
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleLike = async (
    articleId: string,
    initialLikes: number,
    initialDislikes: number,
    onReact?: (articleId: string, action: 'like' | 'unlike' | 'dislike' | 'undislike') => void
  ) => {
    if (!userId) {
      console.warn('Anonymous users cannot react to articles. Please log in.');
      router.push('/login');
      return;
    }

    const isCurrentlyLiked = likedArticleIds.has(articleId);
    const isCurrentlyDisliked = dislikedArticleIds.has(articleId);

    const currentLikes = articleLikes[articleId] ?? initialLikes;
    const currentDislikes = articleDislikes[articleId] ?? initialDislikes;

    // Snapshot for rollback
    const prevLiked = new Set(likedArticleIds);
    const prevDisliked = new Set(dislikedArticleIds);
    const prevLikes = { ...articleLikes };
    const prevDislikes = { ...articleDislikes };

    // Optimistic state updates
    setLikedArticleIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyLiked) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }
      return next;
    });

    setDislikedArticleIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyDisliked) {
        next.delete(articleId);
      }
      return next;
    });

    setArticleLikes((prev) => ({
      ...prev,
      [articleId]: isCurrentlyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1,
    }));

    if (isCurrentlyDisliked) {
      setArticleDislikes((prev) => ({
        ...prev,
        [articleId]: Math.max(0, currentDislikes - 1),
      }));
    }

    // Call onReact callback in the viewport if needed to resort upcoming feed
    if (onReact) {
      if (isCurrentlyLiked) {
        onReact(articleId, 'unlike');
      } else {
        if (isCurrentlyDisliked) {
          onReact(articleId, 'undislike');
        }
        onReact(articleId, 'like');
      }
    }

    try {
      if (isCurrentlyLiked) {
        const result = await mutateArticleReaction(articleId, 'unlike');
        if (result?.success) {
          setArticleLikes((prev) => ({ ...prev, [articleId]: result.likes }));
          setArticleDislikes((prev) => ({ ...prev, [articleId]: result.dislikes }));
        }
      } else {
        if (isCurrentlyDisliked) {
          await mutateArticleReaction(articleId, 'undislike');
        }
        const result = await mutateArticleReaction(articleId, 'like');
        if (result?.success) {
          setArticleLikes((prev) => ({ ...prev, [articleId]: result.likes }));
          setArticleDislikes((prev) => ({ ...prev, [articleId]: result.dislikes }));
        }
      }
    } catch (err) {
      console.error('Like action failed, rolling back:', err);
      // Rollback
      setLikedArticleIds(prevLiked);
      setDislikedArticleIds(prevDisliked);
      setArticleLikes(prevLikes);
      setArticleDislikes(prevDislikes);

      // Rollback viewport callback
      if (onReact) {
        if (isCurrentlyLiked) {
          onReact(articleId, 'like');
        } else {
          onReact(articleId, 'unlike');
          if (isCurrentlyDisliked) {
            onReact(articleId, 'dislike');
          }
        }
      }
    }
  };

  const toggleDislike = async (
    articleId: string,
    initialLikes: number,
    initialDislikes: number,
    onReact?: (articleId: string, action: 'like' | 'unlike' | 'dislike' | 'undislike') => void
  ) => {
    if (!userId) {
      console.warn('Anonymous users cannot react to articles. Please log in.');
      router.push('/login');
      return;
    }

    const isCurrentlyLiked = likedArticleIds.has(articleId);
    const isCurrentlyDisliked = dislikedArticleIds.has(articleId);

    const currentLikes = articleLikes[articleId] ?? initialLikes;
    const currentDislikes = articleDislikes[articleId] ?? initialDislikes;

    // Snapshot for rollback
    const prevLiked = new Set(likedArticleIds);
    const prevDisliked = new Set(dislikedArticleIds);
    const prevLikes = { ...articleLikes };
    const prevDislikes = { ...articleDislikes };

    // Optimistic state updates
    setDislikedArticleIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyDisliked) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }
      return next;
    });

    setLikedArticleIds((prev) => {
      const next = new Set(prev);
      if (isCurrentlyLiked) {
        next.delete(articleId);
      }
      return next;
    });

    setArticleDislikes((prev) => ({
      ...prev,
      [articleId]: isCurrentlyDisliked ? Math.max(0, currentDislikes - 1) : currentDislikes + 1,
    }));

    if (isCurrentlyLiked) {
      setArticleLikes((prev) => ({
        ...prev,
        [articleId]: Math.max(0, currentLikes - 1),
      }));
    }

    // Call onReact callback in the viewport if needed to resort upcoming feed
    if (onReact) {
      if (isCurrentlyDisliked) {
        onReact(articleId, 'undislike');
      } else {
        if (isCurrentlyLiked) {
          onReact(articleId, 'unlike');
        }
        onReact(articleId, 'dislike');
      }
    }

    try {
      if (isCurrentlyDisliked) {
        const result = await mutateArticleReaction(articleId, 'undislike');
        if (result?.success) {
          setArticleLikes((prev) => ({ ...prev, [articleId]: result.likes }));
          setArticleDislikes((prev) => ({ ...prev, [articleId]: result.dislikes }));
        }
      } else {
        if (isCurrentlyLiked) {
          await mutateArticleReaction(articleId, 'unlike');
        }
        const result = await mutateArticleReaction(articleId, 'dislike');
        if (result?.success) {
          setArticleLikes((prev) => ({ ...prev, [articleId]: result.likes }));
          setArticleDislikes((prev) => ({ ...prev, [articleId]: result.dislikes }));
        }
      }
    } catch (err) {
      console.error('Dislike action failed, rolling back:', err);
      // Rollback
      setLikedArticleIds(prevLiked);
      setDislikedArticleIds(prevDisliked);
      setArticleLikes(prevLikes);
      setArticleDislikes(prevDislikes);

      // Rollback viewport callback
      if (onReact) {
        if (isCurrentlyDisliked) {
          onReact(articleId, 'dislike');
        } else {
          onReact(articleId, 'undislike');
          if (isCurrentlyLiked) {
            onReact(articleId, 'like');
          }
        }
      }
    }
  };

  return (
    <InteractionContext.Provider
      value={{
        likedArticleIds,
        dislikedArticleIds,
        articleLikes,
        articleDislikes,
        toggleLike,
        toggleDislike,
        loading,
      }}
    >
      {children}
    </InteractionContext.Provider>
  );
}
